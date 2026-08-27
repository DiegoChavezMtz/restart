import { ForbiddenError, LlmResponseError, UseCaseError } from "@/application/errors";
import type { AchievementEvidence, CvContent, CvQualityCheckResult, JobApplication, RecruiterResearch, User } from "@/domain/entities";
import type { ApplicationRepository, CvRepository, EmploymentProfileRepository, EvidenceRepository, JobTargetRepository, UserProfileRepository } from "@/domain/repositories";
import { checkSpelling } from "@/domain/value-objects/textQualityChecks";
import { EmploymentLlmEngine } from "@/infrastructure/llm/employment/EmploymentLlmEngine";
import { EmploymentLlmGateway } from "@/infrastructure/llm/employment/EmploymentLlmGateway";
import type { JobFitMatrixItem } from "@/infrastructure/llm/employment/types";
import { assertEmploymentUser, requiredText } from "./profileHelpers";
import { randomUUID } from "node:crypto";
import { buildEmploymentCvPdf } from "@/infrastructure/pdf/buildEmploymentCvPdf";

type Context = { requestedBy: User; accessToken: string };
const engine = new EmploymentLlmEngine();
const gateway = new EmploymentLlmGateway();
function context(input: Context): void { assertEmploymentUser(input.requestedBy); }
function profileSnapshot(profile: Awaited<ReturnType<EmploymentProfileRepository["getEmploymentProfile"]>>) {
  return profile ? { headline: profile.headline, summary: profile.summary, experience: profile.experience.map(({ organization, role, contextDescription }) => ({ organization, role, contextDescription })), skills: profile.skills.map((s) => s.name), education: profile.education.map(({ degree, fieldOfStudy }) => ({ degree, fieldOfStudy })) } : { headline: "", summary: "", experience: [], skills: [], education: [] };
}
const QUANTIFIED_TEXT = /\d|[%$€£¥]|\b(?:cero|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cien|mil|mill[oó]n|millones|una\s+vez|un\s+vez)\b/i;
function containsUnconfirmedNumber(text: string, evidence: AchievementEvidence | null): boolean { return QUANTIFIED_TEXT.test(text) && evidence?.metricConfirmedByUser !== true; }
function assertCvContentShape(value: unknown): asserts value is CvContent { if (!value || typeof value !== "object" || Array.isArray(value)) throw new UseCaseError("content no es válido.", 400); const content = value as Partial<CvContent>; if (!Array.isArray(content.experience) || !content.contact || typeof content.summary !== "string" || !Array.isArray(content.education) || !Array.isArray(content.skills)) throw new UseCaseError("content no tiene la estructura requerida.", 400); }

export async function analyzeJobTarget(repos: { targets: JobTargetRepository; profile: EmploymentProfileRepository }, input: Context & { sourceSite: string; rawText: unknown }) {
  context(input); if (!["linkedin", "indeed", "occ", "otro"].includes(input.sourceSite)) throw new UseCaseError("sourceSite no es válido.", 400);
  const rawText = requiredText(input.rawText, "rawText", 20_000); if (rawText.length < 20) throw new UseCaseError("rawText debe contener al menos 20 caracteres.", 400); const profile = await repos.profile.getEmploymentProfile(input.accessToken);
  const result = await gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "extract_job_keywords", promptVersion: "v1", cacheInput: { rawText, profile: profileSnapshot(profile) }, execute: () => engine.extractJobKeywords(rawText) });
  const target = await repos.targets.createJobTarget({ sourceSite: input.sourceSite as JobApplication["source"], rawText, companyName: result.companyName, roleTitle: result.roleTitle }, input.accessToken);
  const searchable = JSON.stringify(profileSnapshot(profile)).toLocaleLowerCase("es-MX");
  const keywords = await repos.targets.saveKeywords(target.id, result.keywords.map((item) => ({ ...item, matchedInProfile: searchable.includes(item.keyword.toLocaleLowerCase("es-MX")) })), input.accessToken);
  return { ...target, keywords };
}

export async function getJobFitMatrix(repos: { targets: JobTargetRepository; profile: EmploymentProfileRepository }, input: Context & { jobTargetId: string }) {
  context(input); const [target, profile] = await Promise.all([repos.targets.getJobTarget(input.jobTargetId, input.accessToken), repos.profile.getEmploymentProfile(input.accessToken)]);
  if (!target) throw new UseCaseError("Vacante no encontrada.", 404); if (!profile) throw new UseCaseError("Completa tu perfil antes de revisar el ajuste.", 409);
  const sources = [
    ...profile.experience.map((item) => ({ id: item.id, type: "experience", label: `${item.role} — ${item.organization}`, content: item.contextDescription })),
    ...profile.skills.map((item) => ({ id: item.id, type: "skill", label: item.name, content: item.category })),
    ...profile.education.map((item) => ({ id: item.id, type: "education", label: `${item.degree} — ${item.institution}`, content: item.fieldOfStudy })),
  ];
  const raw = await gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "job_fit_matrix", promptVersion: "v1", cacheInput: { jobText: target.rawText, sources }, execute: () => engine.buildJobFitMatrix({ jobText: target.rawText, sources }) });
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const items: Array<JobFitMatrixItem & { evidence: typeof sources }> = raw.map((item) => ({ ...item, evidenceRefs: item.evidenceRefs.filter((id) => sourceById.has(id)), evidence: item.evidenceRefs.filter((id) => sourceById.has(id)).map((id) => sourceById.get(id)!).filter(Boolean) }));
  return { items, sources };
}

export async function generateCvDraft(repos: { targets: JobTargetRepository; profile: EmploymentProfileRepository; cv: CvRepository; userProfile: UserProfileRepository }, input: Context & { jobTargetId: string; experienceEntryIds?: unknown }) {
  context(input); const [target, profile, contact] = await Promise.all([repos.targets.getJobTarget(input.jobTargetId, input.accessToken), repos.profile.getEmploymentProfile(input.accessToken), repos.userProfile.getUserProfile(input.accessToken)]);
  if (!target) throw new UseCaseError("Vacante no encontrada.", 404); if (!profile) throw new UseCaseError("Completa tu perfil antes de generar un CV.", 409);
  const selectedIds = input.experienceEntryIds === undefined ? profile.experience.map((e) => e.id) : Array.isArray(input.experienceEntryIds) && input.experienceEntryIds.every((id) => typeof id === "string") ? input.experienceEntryIds : null;
  if (!selectedIds || selectedIds.length === 0) throw new UseCaseError("Selecciona al menos una experiencia para el CV.", 400);
  const selectedExperience = profile.experience.filter((entry) => selectedIds.includes(entry.id)); if (selectedExperience.length !== selectedIds.length) throw new UseCaseError("Una experiencia seleccionada no pertenece a tu perfil.", 400);
  const selectedProfile = { ...profile, experience: selectedExperience };
  const summary = await gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "draft_cv_summary", promptVersion: "v2", cacheInput: { profile: profileSnapshot(selectedProfile), keywords: target.keywords }, execute: () => engine.draftCvSummary({ profile: profileSnapshot(selectedProfile), keywords: target.keywords }) });
  const content: CvContent = { contact: { fullName: input.requestedBy.fullName, email: input.requestedBy.email, phone: contact?.phone ?? "", location: contact?.location ?? "", linkedinUrl: contact?.linkedinUrl ?? null }, summary: summary.summary, experience: selectedExperience.map((e) => ({ experienceEntryId: e.id, organization: e.organization, role: e.role, location: e.location, startDate: e.startDate, endDate: e.endDate, bullets: [] })), education: profile.education.map((e) => ({ institution: e.institution, degree: e.degree, fieldOfStudy: e.fieldOfStudy, startDate: e.startDate, endDate: e.endDate })), skills: profile.skills.map((s) => s.name) };
  return repos.cv.create({ jobTargetId: target.id, title: `${summary.headline} — ${target.roleTitle || "CV"}`, content }, input.accessToken);
}

export async function getCvSummaryAlternatives(repos: { cv: CvRepository; targets: JobTargetRepository; profile: EmploymentProfileRepository }, input: Context & { cvId: string }) {
  context(input); const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404);
  const [target, profile] = await Promise.all([repos.targets.getJobTarget(cv.jobTargetId, input.accessToken), repos.profile.getEmploymentProfile(input.accessToken)]);
  if (!target || !profile) throw new UseCaseError("No se pudo preparar el contexto del CV.", 409);
  const selected = profile.experience.filter((item) => cv.content.experience.some((block) => block.experienceEntryId === item.id));
  return gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "draft_cv_summary_options", promptVersion: "v1", cacheInput: { selected, skills: profile.skills, keywords: target.keywords }, execute: () => engine.draftCvSummaryOptions({ selectedExperience: selected, skills: profile.skills, keywords: target.keywords }) });
}

export async function applyCvSummaryAlternative(repos: { cv: CvRepository }, input: Context & { cvId: string; headline: unknown; summary: unknown }) {
  context(input); const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404);
  const headline = requiredText(input.headline, "headline", 160); const summary = requiredText(input.summary, "summary", 900);
  const content = { ...cv.content, summary }; await repos.cv.updateContent(cv.id, content, input.accessToken);
  return repos.cv.updateTitle(cv.id, headline, input.accessToken);
}

export async function requestEvidenceQuestion(input: Context & { claim: unknown }) { context(input); const claim = requiredText(input.claim, "claim", 800); if (claim.length < 5) throw new UseCaseError("claim debe contener al menos 5 caracteres.", 400); return gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "evidence_question", promptVersion: "v1", cacheInput: { claim }, execute: () => engine.askEvidenceQuestion(claim) }); }

export async function generateIkigaiSynthesis(
  input: Context & {
    whatYouLove: unknown;
    whatYouAreGoodAt: unknown;
    whatWorldNeeds: unknown;
    whatYouCanBePaidFor: unknown;
  }
) {
  context(input);
  const ikigai = {
    whatYouLove: requiredText(input.whatYouLove, "whatYouLove"),
    whatYouAreGoodAt: requiredText(input.whatYouAreGoodAt, "whatYouAreGoodAt"),
    whatWorldNeeds: requiredText(input.whatWorldNeeds, "whatWorldNeeds"),
    whatYouCanBePaidFor: requiredText(input.whatYouCanBePaidFor, "whatYouCanBePaidFor"),
  };
  return gateway.run({
    accessToken: input.accessToken,
    userId: input.requestedBy.id,
    task: "ikigai_synthesis",
    promptVersion: "v1",
    cacheInput: ikigai,
    execute: () => engine.synthesizeIkigai(ikigai),
  });
}

export async function draftCvBullet(repos: { cv: CvRepository; targets: JobTargetRepository; evidence: EvidenceRepository }, input: Context & { cvId: string; experienceEntryId: string; evidenceId: string | null; claim: unknown }) {
  context(input); const claim = requiredText(input.claim, "claim", 800); if (claim.length < 5) throw new UseCaseError("claim debe contener al menos 5 caracteres.", 400); const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404); const target = await repos.targets.getJobTarget(cv.jobTargetId, input.accessToken); if (!target) throw new UseCaseError("Vacante no encontrada.", 404);
  const evidenceItems = await repos.evidence.listByExperience(input.experienceEntryId, input.accessToken); const evidence = input.evidenceId ? evidenceItems.find((e) => e.id === input.evidenceId) || null : null;
  if (input.evidenceId && !evidence) throw new UseCaseError("La evidencia no pertenece a esta experiencia.", 400);
  const result = await gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "draft_cv_bullet", promptVersion: "v2", cacheInput: { claim, evidence, keywords: target.keywords }, execute: () => engine.draftCvBullet({ claim, evidence, keywords: target.keywords }) });
  if (result.alternatives.some((alternative) => containsUnconfirmedNumber(alternative, evidence))) throw new LlmResponseError("El modelo propuso una cifra sin evidencia confirmada.");
  return { ...result, evidenceId: evidence?.id || null };
}

/** Crea evidencia persistida antes de proponer un bullet. La propuesta no modifica el CV. */
export async function createCvBulletDraft(repos: { cv: CvRepository; targets: JobTargetRepository; evidence: EvidenceRepository }, input: Context & { cvId: string; experienceEntryId: string; claim: unknown; metricValue: unknown; metricConfirmedByUser: unknown }) {
  context(input);
  if (typeof input.metricConfirmedByUser !== "boolean") throw new UseCaseError("metricConfirmedByUser debe ser booleano.", 400);
  const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404);
  if (!cv.content.experience.some((item) => item.experienceEntryId === input.experienceEntryId)) throw new UseCaseError("La experiencia no pertenece al CV.", 400);
  const claim = requiredText(input.claim, "claim", 800);
  const metricValue = input.metricConfirmedByUser ? requiredText(input.metricValue, "metricValue", 500) : null;
  const evidence = await repos.evidence.create({ experienceEntryId: input.experienceEntryId, claim, metricValue, metricConfirmedByUser: input.metricConfirmedByUser }, input.accessToken);
  const drafted = await draftCvBullet(repos, { ...input, claim, evidenceId: evidence.id });
  return { bullets: drafted.alternatives.map((text) => ({ id: randomUUID(), text, evidenceId: evidence.id, approved: false })), evidence };
}

/** Valida cada mutación de contenido contra perfil/evidencia reales y reinicia calidad. */
export async function updateCvContent(repos: { cv: CvRepository; evidence: EvidenceRepository }, input: Context & { cvId: string; content: unknown }) {
  context(input); assertCvContentShape(input.content);
  const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404);
  const submitted = input.content;
  const originalByExperience = new Map(cv.content.experience.map((item) => [item.experienceEntryId, item]));
  if (submitted.experience.length !== originalByExperience.size) throw new UseCaseError("No puedes agregar experiencias al CV desde esta ruta.", 400);
  const seen = new Set<string>();
  for (const block of submitted.experience) {
    if (!block || typeof block !== "object" || typeof block.experienceEntryId !== "string" || seen.has(block.experienceEntryId)) throw new UseCaseError("La estructura de experiencia no es válida.", 400);
    seen.add(block.experienceEntryId); const original = originalByExperience.get(block.experienceEntryId);
    if (!original || !Array.isArray(block.bullets)) throw new UseCaseError("Una experiencia no pertenece a este CV.", 400);
    const evidence = await repos.evidence.listByExperience(block.experienceEntryId, input.accessToken); const byId = new Map(evidence.map((item) => [item.id, item]));
    for (const bullet of block.bullets) {
      if (!bullet || typeof bullet !== "object" || typeof bullet.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bullet.id) || typeof bullet.text !== "string" || typeof bullet.approved !== "boolean") throw new UseCaseError("Un bullet no tiene formato válido.", 400);
      const text = bullet.text.trim(); if (!text || text.length > 400) throw new UseCaseError("El texto de un bullet no es válido.", 400);
      const evidenceId = bullet.evidenceId === null ? null : typeof bullet.evidenceId === "string" ? bullet.evidenceId : undefined;
      if (evidenceId === undefined) throw new UseCaseError("evidenceId no es válido.", 400);
      const item = evidenceId ? byId.get(evidenceId) || null : null;
      if (evidenceId && !item) throw new UseCaseError("La evidencia de un bullet no pertenece a su experiencia.", 400);
      if (containsUnconfirmedNumber(text, item)) throw new UseCaseError("No se puede guardar una cifra sin evidencia confirmada por el usuario.", 409);
    }
  }
  return repos.cv.updateContent(cv.id, submitted, input.accessToken);
}

export async function runCvQualityCheck(repos: { cv: CvRepository; evidence: EvidenceRepository }, input: Context & { cvId: string }) {
  context(input); const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404);
  const allBullets = cv.content.experience.flatMap((item) => item.bullets);
  const evidenceByExperience = new Map(await Promise.all(cv.content.experience.map(async (item) => [item.experienceEntryId, new Map((await repos.evidence.listByExperience(item.experienceEntryId, input.accessToken)).map((evidence) => [evidence.id, evidence]))] as const)));
  const noUnconfirmedNumbers = cv.content.experience.every((experience) => experience.bullets.every((bullet) => !QUANTIFIED_TEXT.test(bullet.text) || (bullet.evidenceId !== null && evidenceByExperience.get(experience.experienceEntryId)?.get(bullet.evidenceId)?.metricConfirmedByUser === true)));
  const spelling = checkSpelling([cv.content.summary, ...allBullets.map((bullet) => bullet.text)]);
  const coherence = await gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "cv_coherence_check", promptVersion: "v2", cacheInput: cv.content, execute: () => engine.checkCvCoherence(cv.content) });
  const layout = await buildEmploymentCvPdf(cv.content);
  const result: CvQualityCheckResult = { spellingOk: spelling.ok, spellingIssues: spelling.issues, lengthOk: layout.pageCount === 1, layoutPageCount: layout.pageCount, noUnconfirmedNumbers, coherenceNotes: coherence.notes, checkedAt: new Date().toISOString() };
  return repos.cv.setQualityCheck(cv.id, result, input.accessToken);
}

export async function renameCvVersion(repos: { cv: CvRepository }, input: Context & { cvId: string; title: unknown }) {
  context(input);
  const title = requiredText(input.title, "title", 200);
  const cv = await repos.cv.get(input.cvId, input.accessToken);
  if (!cv) throw new UseCaseError("CV no encontrado.", 404);
  return repos.cv.renameCv(cv.id, title, input.accessToken);
}

export async function markCvAsSent(repos: { cv: CvRepository }, input: Context & { cvId: string }) { context(input); const cv = await repos.cv.get(input.cvId, input.accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404); const quality = cv.qualityCheck; const allApproved = cv.content.experience.every((e) => e.bullets.every((b) => b.approved)); const bulletCount = cv.content.experience.reduce((count, e) => count + e.bullets.length, 0); const usefulContent = Boolean(cv.content.contact.fullName.trim() && cv.content.contact.email.trim() && cv.content.summary.trim() && bulletCount > 0); if (cv.status !== "quality_review" || !quality?.spellingOk || !quality.lengthOk || !quality.noUnconfirmedNumbers || !allApproved || !usefulContent) throw new UseCaseError("El CV no cumple el control de calidad obligatorio.", 409); return repos.cv.setStatus(cv.id, "sent", input.accessToken); }

export async function generateOutreachMessage(repos: { applications: ApplicationRepository }, input: Context & { applicationId: string; research: Omit<RecruiterResearch, "jobApplicationId" | "outreachMessage" | "completedAt"> }) {
  context(input); const application = await repos.applications.get(input.applicationId, input.accessToken); if (!application) throw new UseCaseError("Postulación no encontrada.", 404); if (application.source !== "linkedin") throw new ForbiddenError();
  const research = { ...input.research, companyName: application.companyName, roleTitle: application.roleTitle };
  const result = await gateway.run({ accessToken: input.accessToken, userId: input.requestedBy.id, task: "outreach_message", promptVersion: "v1", cacheInput: research, execute: () => engine.draftOutreachMessage(research) });
  return repos.applications.upsertResearch({ jobApplicationId: application.id, ...input.research, outreachMessage: result.message, completedAt: null }, input.accessToken);
}

export async function saveOutreachDraft(repos: { applications: ApplicationRepository }, input: Context & { applicationId: string; research: RecruiterResearch }) {
  context(input); const application = await repos.applications.get(input.applicationId, input.accessToken); if (!application) throw new UseCaseError("Postulación no encontrada.", 404); if (application.source !== "linkedin") throw new ForbiddenError();
  if (!input.research.outreachMessage.trim()) throw new UseCaseError("Escribe un mensaje antes de guardar el borrador.", 400);
  const existing = await repos.applications.getResearch(application.id, input.accessToken);
  return repos.applications.upsertResearch({ ...input.research, jobApplicationId: application.id, completedAt: existing?.completedAt ?? null }, input.accessToken);
}

export async function confirmOutreachSent(repos: { applications: ApplicationRepository }, input: Context & { applicationId: string }) {
  context(input); const application = await repos.applications.get(input.applicationId, input.accessToken); if (!application) throw new UseCaseError("Postulación no encontrada.", 404); if (application.source !== "linkedin") throw new ForbiddenError();
  const research = await repos.applications.getResearch(application.id, input.accessToken);
  if (!research?.outreachMessage.trim()) throw new UseCaseError("Guarda un mensaje de contacto antes de confirmarlo como enviado.", 409);
  const [updatedApplication, updatedResearch] = await Promise.all([
    repos.applications.updateType(application.id, "proactive", input.accessToken),
    repos.applications.upsertResearch({ ...research, completedAt: new Date().toISOString() }, input.accessToken),
  ]);
  return { application: updatedApplication, research: updatedResearch };
}
