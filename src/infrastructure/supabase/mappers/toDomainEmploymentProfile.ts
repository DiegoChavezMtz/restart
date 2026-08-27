import type { EducationEntry, EmploymentProfile, ExperienceEntry, ProfileItemOrigin, SkillItem } from "@/domain/entities";

type ProfileRow = { id: string; user_id: string; headline: string; summary: string; updated_at: string };
type ExperienceRow = { id: string; profile_id: string; organization: string; role: string; location: string | null; start_date: string | null; end_date: string | null; is_current: boolean; context_description: string; order_index: number; origin_type: ProfileItemOrigin["type"]; origin_ref_id: string | null };
type SkillRow = { id: string; profile_id: string; name: string; category: SkillItem["category"]; origin_type: ProfileItemOrigin["type"]; origin_ref_id: string | null };
type EducationRow = { id: string; profile_id: string; institution: string; degree: string; field_of_study: string | null; start_date: string | null; end_date: string | null; is_current: boolean };

function toOrigin(type: ProfileItemOrigin["type"], refId: string | null): ProfileItemOrigin {
  return type === "manual" ? { type, refId: null } : { type, refId };
}

export function toDomainExperienceEntry(row: ExperienceRow): ExperienceEntry {
  return { id: row.id, profileId: row.profile_id, organization: row.organization, role: row.role, location: row.location ?? "", startDate: row.start_date ?? "", endDate: row.end_date, isCurrent: row.is_current, contextDescription: row.context_description, order: row.order_index, origin: toOrigin(row.origin_type, row.origin_ref_id) };
}

export function toDomainSkillItem(row: SkillRow): SkillItem {
  return { id: row.id, profileId: row.profile_id, name: row.name, category: row.category, origin: toOrigin(row.origin_type, row.origin_ref_id) };
}

export function toDomainEducationEntry(row: EducationRow): EducationEntry {
  return { id: row.id, profileId: row.profile_id, institution: row.institution, degree: row.degree, fieldOfStudy: row.field_of_study ?? "", startDate: row.start_date ?? "", endDate: row.end_date, isCurrent: row.is_current };
}

export function toDomainEmploymentProfile(row: ProfileRow, experience: ExperienceEntry[], skills: SkillItem[], education: EducationEntry[]): EmploymentProfile {
  return { id: row.id, userId: row.user_id, headline: row.headline, summary: row.summary, updatedAt: row.updated_at, experience, skills, education };
}
