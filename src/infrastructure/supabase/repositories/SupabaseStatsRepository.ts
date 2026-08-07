import { UseCaseError } from "@/application/errors";
import type { Answer, FormResponse, User } from "@/domain/entities";
import type { StatsRepository } from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainAnswer } from "@/infrastructure/supabase/mappers/toDomainAnswer";
import { toDomainFormResponse } from "@/infrastructure/supabase/mappers/toDomainFormResponse";
import { toDomainUser } from "@/infrastructure/supabase/mappers/toDomainUser";

export class SupabaseStatsRepository implements StatsRepository {
  async listResponsesByForm(formId: string, adminAccessToken: string): Promise<FormResponse[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("form_responses")
      .select("*")
      .eq("form_id", formId)
      .eq("is_test_response", false);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainFormResponse);
  }

  async listAnswersByForm(formId: string, adminAccessToken: string): Promise<Answer[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("answers")
      .select("*, form_responses!inner(form_id,is_test_response)")
      .eq("form_responses.form_id", formId)
      .eq("form_responses.is_test_response", false);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainAnswer);
  }

  async listResponsesForParticipant(
    participantId: string,
    adminAccessToken: string
  ): Promise<FormResponse[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("form_responses")
      .select("*")
      .eq("participant_id", participantId);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainFormResponse);
  }

  async getUserById(userId: string, adminAccessToken: string): Promise<User | null> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) return null;
    return toDomainUser(row);
  }
}
