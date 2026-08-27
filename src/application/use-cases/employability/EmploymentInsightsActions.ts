import type { ApplicationRepository, CvRepository, EmploymentProfileRepository, EvidenceRepository, JobTargetRepository } from "@/domain/repositories";
import type { ApplicationStatus, JobApplication, User } from "@/domain/entities";
import { assertEmploymentUser } from "./profileHelpers";

type Context = { requestedBy: User; accessToken: string };
export type EmploymentInsightAction = { title: string; detail: string; href: string; priority: "high" | "medium" | "low" };
export type EmploymentInsights = {
  totalApplications: number;
  applicationsByWeek: Array<{ weekOf: string; count: number }>;
  conversions: { applicationToResponse: number | null; responseToInterview: number | null; interviewToOffer: number | null };
  bySource: Array<{ source: JobApplication["source"]; total: number; responseRate: number | null }>;
  byType: Array<{ type: JobApplication["applicationType"]; total: number; responseRate: number | null }>;
  staleApplications: Array<Pick<JobApplication, "id" | "companyName" | "roleTitle" | "status" | "statusUpdatedAt">>;
  nextAction: EmploymentInsightAction;
  recommendations: EmploymentInsightAction[];
};

const MS_DAY = 86_400_000;
const rate = (numerator: number, denominator: number) => denominator ? Math.round((numerator / denominator) * 100) : null;
const weekOf = (value: string) => { const date = new Date(`${value.slice(0, 10)}T12:00:00Z`); const day = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - day); return date.toISOString().slice(0, 10); };
const hasReached = (statuses: Set<ApplicationStatus>, target: ApplicationStatus) => statuses.has(target) || (target === "response" && (statuses.has("interview") || statuses.has("offer"))) || (target === "interview" && statuses.has("offer"));

export async function getEmploymentInsights(repos: { applications: ApplicationRepository; cv: CvRepository; profile: EmploymentProfileRepository; evidence: EvidenceRepository; targets: JobTargetRepository }, input: Context): Promise<EmploymentInsights> {
  assertEmploymentUser(input.requestedBy);
  const [applications, events, cvs, profile, targets] = await Promise.all([repos.applications.list(input.accessToken), repos.applications.listStatusEvents(input.accessToken), repos.cv.list(input.accessToken), repos.profile.getEmploymentProfile(input.accessToken), repos.targets.listJobTargets(input.accessToken)]);
  const eventStatuses = new Map<string, Set<ApplicationStatus>>();
  for (const event of events) eventStatuses.set(event.jobApplicationId, new Set([...(eventStatuses.get(event.jobApplicationId) ?? []), event.status]));
  const reached = (app: JobApplication, status: ApplicationStatus) => hasReached(new Set([...(eventStatuses.get(app.id) ?? []), app.status]), status);
  const now = Date.now();
  const staleApplications = applications.filter((app) => !["offer", "rejected"].includes(app.status) && (now - new Date(app.statusUpdatedAt).getTime()) / MS_DAY >= 5).map(({ id, companyName, roleTitle, status, statusUpdatedAt }) => ({ id, companyName, roleTitle, status, statusUpdatedAt }));
  const sourceValues: JobApplication["source"][] = ["linkedin", "indeed", "occ", "otro"];
  const typeValues: JobApplication["applicationType"][] = ["reactive", "proactive"];
  const applicationsByWeek = Array.from({ length: 8 }, (_, index) => { const date = new Date(); date.setUTCDate(date.getUTCDate() - (7 * (7 - index))); const start = weekOf(date.toISOString()); return { weekOf: start, count: applications.filter((app) => weekOf(app.appliedAt) === start).length }; });
  const responseApps = applications.filter((app) => reached(app, "response"));
  const interviewApps = applications.filter((app) => reached(app, "interview"));
  const offerApps = applications.filter((app) => reached(app, "offer"));
  const missingEvidence = profile ? (await Promise.all(profile.experience.map(async (experience) => ({ experience, evidence: await repos.evidence.listByExperience(experience.id, input.accessToken) })))).find((item) => item.evidence.length === 0) : null;
  const actions: EmploymentInsightAction[] = [];
  if (staleApplications[0]) actions.push({ title: "Actualiza una postulación", detail: `${staleApplications[0].companyName} lleva 5 días o más sin cambio de estatus.`, href: "/employment/applications", priority: "high" });
  const reactiveLinkedin = applications.find((app) => app.source === "linkedin" && app.applicationType === "reactive");
  if (reactiveLinkedin) actions.push({ title: "Confirma un contacto de LinkedIn", detail: `${reactiveLinkedin.companyName}: investiga, edita el mensaje y confirma el envío solo si ya lo realizaste.`, href: `/employment/applications/${reactiveLinkedin.id}/outreach`, priority: "high" });
  if (missingEvidence) actions.push({ title: "Completa evidencia de una experiencia", detail: `Agrega un logro verificable para ${missingEvidence.experience.role} antes de usarlo en el CV.`, href: "/employment/cv", priority: "medium" });
  if (cvs.some((cv) => cv.status !== "sent")) actions.push({ title: "Revisa y exporta tu CV", detail: "Completa los controles de calidad antes de utilizar una versión para postular.", href: "/employment/cv", priority: "medium" });
  if (!targets.length) actions.push({ title: "Analiza una vacante", detail: "Pega una vacante real para identificar requisitos y adaptar tu CV.", href: "/employment/targets/new", priority: "medium" });
  if (!applications.length) actions.push({ title: "Registra una postulación", detail: "Cuando postules, regístrala para que el embudo pueda orientarte.", href: "/employment/applications", priority: "low" });
  const fallback: EmploymentInsightAction = { title: "Mantén el seguimiento al día", detail: "Actualiza el estatus de cada proceso cuando recibas novedades.", href: "/employment/applications", priority: "low" };
  return { totalApplications: applications.length, applicationsByWeek, conversions: { applicationToResponse: rate(responseApps.length, applications.length), responseToInterview: rate(interviewApps.length, responseApps.length), interviewToOffer: rate(offerApps.length, interviewApps.length) }, bySource: sourceValues.map((source) => { const rows = applications.filter((app) => app.source === source); return { source, total: rows.length, responseRate: rate(rows.filter((app) => reached(app, "response")).length, rows.length) }; }), byType: typeValues.map((type) => { const rows = applications.filter((app) => app.applicationType === type); return { type, total: rows.length, responseRate: rate(rows.filter((app) => reached(app, "response")).length, rows.length) }; }), staleApplications, nextAction: actions[0] ?? fallback, recommendations: actions.slice(1, 4) };
}
