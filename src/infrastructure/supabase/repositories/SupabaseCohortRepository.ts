import { UseCaseError } from "@/application/errors";
import type { Cohort, User } from "@/domain/entities";
import type { CohortRepository, CreateCohortInput } from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainCohort } from "@/infrastructure/supabase/mappers/toDomainCohort";
import { toDomainUser } from "@/infrastructure/supabase/mappers/toDomainUser";

export class SupabaseCohortRepository implements CohortRepository {
  async createCohort(input: CreateCohortInput, adminAccessToken: string): Promise<Cohort> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("cohorts")
      .insert({ name: input.name, description: input.description })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to create cohort", 500);
    return toDomainCohort(row);
  }

  async listCohorts(adminAccessToken: string): Promise<Cohort[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("cohorts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainCohort);
  }

  async getCohortById(cohortId: string, adminAccessToken: string): Promise<Cohort | null> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("cohorts")
      .select("*")
      .eq("id", cohortId)
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) return null;
    return toDomainCohort(row);
  }

  async listParticipantsByCohort(cohortId: string, adminAccessToken: string): Promise<User[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainUser);
  }
}
