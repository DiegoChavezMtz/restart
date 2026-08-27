import { UseCaseError } from "@/application/errors";
import type { EducationEntry, EmploymentProfile, ExperienceEntry, SkillItem } from "@/domain/entities";
import type { CreateEducationEntryInput, CreateExperienceEntryInput, CreateSkillItemInput, EmploymentProfileRepository, UpdateEducationEntryInput, UpdateEmploymentProfileInput, UpdateExperienceEntryInput, UpdateSkillItemInput } from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainEducationEntry, toDomainEmploymentProfile, toDomainExperienceEntry, toDomainSkillItem } from "@/infrastructure/supabase/mappers/toDomainEmploymentProfile";

export class SupabaseEmploymentProfileRepository implements EmploymentProfileRepository {
  private async profileId(accessToken: string): Promise<string> {
    const client = createServerSupabaseClient(accessToken);
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) throw new UseCaseError(authError?.message ?? "No se pudo identificar al usuario.", 401);
    const { data, error } = await client.from("employment_profiles").upsert({ user_id: authData.user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("id").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo preparar el perfil.", 500);
    return data.id;
  }

  async getEmploymentProfile(accessToken: string): Promise<EmploymentProfile | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data: profile, error } = await client.from("employment_profiles").select("*").maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!profile) return null;
    const [experienceResult, skillsResult, educationResult] = await Promise.all([
      client.from("experience_entries").select("*").eq("profile_id", profile.id).order("order_index").order("id"),
      client.from("skill_items").select("*").eq("profile_id", profile.id).order("name"),
      client.from("education_entries").select("*").eq("profile_id", profile.id).order("start_date", { ascending: false }).order("id"),
    ]);
    const childError = experienceResult.error ?? skillsResult.error ?? educationResult.error;
    if (childError) throw new UseCaseError(childError.message, 500);
    return toDomainEmploymentProfile(profile, (experienceResult.data ?? []).map(toDomainExperienceEntry), (skillsResult.data ?? []).map(toDomainSkillItem), (educationResult.data ?? []).map(toDomainEducationEntry));
  }

  async updateEmploymentProfile(input: UpdateEmploymentProfileInput, accessToken: string): Promise<EmploymentProfile> {
    const id = await this.profileId(accessToken);
    const client = createServerSupabaseClient(accessToken);
    const { error } = await client.from("employment_profiles").update({ ...(input.headline !== undefined && { headline: input.headline }), ...(input.summary !== undefined && { summary: input.summary }), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new UseCaseError(error.message, 500);
    const profile = await this.getEmploymentProfile(accessToken);
    if (!profile) throw new UseCaseError("No se pudo recuperar el perfil.", 500);
    return profile;
  }

  async addExperienceEntry(input: CreateExperienceEntryInput, accessToken: string): Promise<ExperienceEntry> {
    const profileId = await this.profileId(accessToken); const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.from("experience_entries").insert({ profile_id: profileId, organization: input.organization, role: input.role, location: input.location ?? "", start_date: input.startDate ?? "", end_date: input.isCurrent ? null : input.endDate ?? null, is_current: input.isCurrent ?? false, context_description: input.contextDescription ?? "", order_index: input.order ?? 0, origin_type: input.origin?.type ?? "manual", origin_ref_id: input.origin?.refId ?? null }).select("*").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo guardar la experiencia.", 500); return toDomainExperienceEntry(data);
  }
  async updateExperienceEntry(id: string, input: UpdateExperienceEntryInput, accessToken: string): Promise<ExperienceEntry> {
    const row = await this.updateItem("experience_entries", id, { ...(input.organization !== undefined && { organization: input.organization }), ...(input.role !== undefined && { role: input.role }), ...(input.location !== undefined && { location: input.location }), ...(input.startDate !== undefined && { start_date: input.startDate }), ...(input.endDate !== undefined && { end_date: input.isCurrent ? null : input.endDate }), ...(input.isCurrent !== undefined && { is_current: input.isCurrent }), ...(input.contextDescription !== undefined && { context_description: input.contextDescription }), ...(input.order !== undefined && { order_index: input.order }), ...(input.origin !== undefined && { origin_type: input.origin.type, origin_ref_id: input.origin.refId }) }, accessToken); return toDomainExperienceEntry(row);
  }
  async deleteExperienceEntry(id: string, accessToken: string): Promise<void> { await this.deleteItem("experience_entries", id, accessToken); }
  async addSkillItem(input: CreateSkillItemInput, accessToken: string): Promise<SkillItem> {
    const profileId = await this.profileId(accessToken); const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.from("skill_items").insert({ profile_id: profileId, name: input.name, category: input.category, origin_type: input.origin?.type ?? "manual", origin_ref_id: input.origin?.refId ?? null }).select("*").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo guardar la habilidad.", 500); return toDomainSkillItem(data);
  }
  async updateSkillItem(id: string, input: UpdateSkillItemInput, accessToken: string): Promise<SkillItem> {
    const row = await this.updateItem("skill_items", id, { ...(input.name !== undefined && { name: input.name }), ...(input.category !== undefined && { category: input.category }), ...(input.origin !== undefined && { origin_type: input.origin.type, origin_ref_id: input.origin.refId }) }, accessToken); return toDomainSkillItem(row);
  }
  async deleteSkillItem(id: string, accessToken: string): Promise<void> { await this.deleteItem("skill_items", id, accessToken); }
  async addEducationEntry(input: CreateEducationEntryInput, accessToken: string): Promise<EducationEntry> {
    const profileId = await this.profileId(accessToken); const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.from("education_entries").insert({ profile_id: profileId, institution: input.institution, degree: input.degree, field_of_study: input.fieldOfStudy ?? "", start_date: input.startDate ?? "", end_date: input.isCurrent ? null : input.endDate ?? null, is_current: input.isCurrent ?? false }).select("*").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudieron guardar los estudios.", 500); return toDomainEducationEntry(data);
  }
  async updateEducationEntry(id: string, input: UpdateEducationEntryInput, accessToken: string): Promise<EducationEntry> {
    const row = await this.updateItem("education_entries", id, { ...(input.institution !== undefined && { institution: input.institution }), ...(input.degree !== undefined && { degree: input.degree }), ...(input.fieldOfStudy !== undefined && { field_of_study: input.fieldOfStudy }), ...(input.startDate !== undefined && { start_date: input.startDate }), ...(input.endDate !== undefined && { end_date: input.isCurrent ? null : input.endDate }), ...(input.isCurrent !== undefined && { is_current: input.isCurrent }) }, accessToken); return toDomainEducationEntry(row);
  }
  async deleteEducationEntry(id: string, accessToken: string): Promise<void> { await this.deleteItem("education_entries", id, accessToken); }

  private async updateItem(table: "experience_entries" | "skill_items" | "education_entries", id: string, input: object, accessToken: string): Promise<never> {
    const client = createServerSupabaseClient(accessToken); const { data, error } = await client.from(table).update(input).eq("id", id).select("*").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo actualizar el elemento.", 500); return data as never;
  }
  private async deleteItem(table: "experience_entries" | "skill_items" | "education_entries", id: string, accessToken: string): Promise<void> {
    const client = createServerSupabaseClient(accessToken); const { error } = await client.from(table).delete().eq("id", id); if (error) throw new UseCaseError(error.message, 500);
  }
}
