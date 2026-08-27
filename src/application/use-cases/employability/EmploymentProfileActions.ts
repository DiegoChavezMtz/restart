import { UseCaseError } from "@/application/errors";
import type { EducationEntry, EmploymentProfile, ExperienceEntry, SkillCategory, SkillItem, User } from "@/domain/entities";
import type { CreateEducationEntryInput, CreateExperienceEntryInput, CreateSkillItemInput, EmploymentProfileRepository, UpdateEducationEntryInput, UpdateEmploymentProfileInput, UpdateExperienceEntryInput, UpdateSkillItemInput } from "@/domain/repositories";
import { assertEmploymentUser, optionalBoolean, optionalNullableText, optionalText, requiredText } from "./profileHelpers";

type RequestContext = { requestedBy: User; accessToken: string };
const categories = new Set<SkillCategory>(["hard", "soft", "tool", "language"]);

function context(input: RequestContext): void { assertEmploymentUser(input.requestedBy); }

export function getEmploymentProfile(repo: EmploymentProfileRepository, input: RequestContext): Promise<EmploymentProfile | null> { context(input); return repo.getEmploymentProfile(input.accessToken); }
export function updateEmploymentProfile(repo: EmploymentProfileRepository, input: UpdateEmploymentProfileInput & RequestContext): Promise<EmploymentProfile> {
  context(input); const update = { headline: optionalText(input.headline, "headline"), summary: optionalText(input.summary, "summary") };
  if (update.headline === undefined && update.summary === undefined) throw new UseCaseError("Incluye al menos un campo del perfil para guardar.", 400);
  return repo.updateEmploymentProfile(update, input.accessToken);
}
export function addExperienceEntry(repo: EmploymentProfileRepository, input: CreateExperienceEntryInput & RequestContext): Promise<ExperienceEntry> {
  context(input); return repo.addExperienceEntry({ organization: requiredText(input.organization, "organization"), role: requiredText(input.role, "role"), location: optionalText(input.location, "location"), startDate: optionalText(input.startDate, "startDate", 7), endDate: optionalNullableText(input.endDate, "endDate"), isCurrent: optionalBoolean(input.isCurrent, "isCurrent"), contextDescription: optionalText(input.contextDescription, "contextDescription"), order: input.order, origin: input.origin }, input.accessToken);
}
export function updateExperienceEntry(repo: EmploymentProfileRepository, id: string, input: UpdateExperienceEntryInput & RequestContext): Promise<ExperienceEntry> { context(input); return repo.updateExperienceEntry(id, input, input.accessToken); }
export function deleteExperienceEntry(repo: EmploymentProfileRepository, id: string, input: RequestContext): Promise<void> { context(input); return repo.deleteExperienceEntry(id, input.accessToken); }
export function addSkillItem(repo: EmploymentProfileRepository, input: CreateSkillItemInput & RequestContext): Promise<SkillItem> {
  context(input); if (!categories.has(input.category)) throw new UseCaseError("category no es válida.", 400);
  return repo.addSkillItem({ name: requiredText(input.name, "name"), category: input.category, origin: input.origin }, input.accessToken);
}
export function updateSkillItem(repo: EmploymentProfileRepository, id: string, input: UpdateSkillItemInput & RequestContext): Promise<SkillItem> { context(input); return repo.updateSkillItem(id, input, input.accessToken); }
export function deleteSkillItem(repo: EmploymentProfileRepository, id: string, input: RequestContext): Promise<void> { context(input); return repo.deleteSkillItem(id, input.accessToken); }
export function addEducationEntry(repo: EmploymentProfileRepository, input: CreateEducationEntryInput & RequestContext): Promise<EducationEntry> {
  context(input); return repo.addEducationEntry({ institution: requiredText(input.institution, "institution"), degree: requiredText(input.degree, "degree"), fieldOfStudy: optionalText(input.fieldOfStudy, "fieldOfStudy"), startDate: optionalText(input.startDate, "startDate", 7), endDate: optionalNullableText(input.endDate, "endDate"), isCurrent: optionalBoolean(input.isCurrent, "isCurrent") }, input.accessToken);
}
export function updateEducationEntry(repo: EmploymentProfileRepository, id: string, input: UpdateEducationEntryInput & RequestContext): Promise<EducationEntry> { context(input); return repo.updateEducationEntry(id, input, input.accessToken); }
export function deleteEducationEntry(repo: EmploymentProfileRepository, id: string, input: RequestContext): Promise<void> { context(input); return repo.deleteEducationEntry(id, input.accessToken); }
