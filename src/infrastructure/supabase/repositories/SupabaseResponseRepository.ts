import { FormResponseNotFoundError, UseCaseError } from "@/application/errors";
import type { Answer, Form, FormResponse } from "@/domain/entities";
import type { ResponseRepository } from "@/domain/repositories";
import type { AnswerValue } from "@/domain/value-objects";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainAnswer } from "@/infrastructure/supabase/mappers/toDomainAnswer";
import { toDomainForm } from "@/infrastructure/supabase/mappers/toDomainForm";
import { toDomainFormResponse } from "@/infrastructure/supabase/mappers/toDomainFormResponse";

export class SupabaseResponseRepository implements ResponseRepository {
  async listVisibleForms(accessToken: string): Promise<Form[]> {
    // RLS (forms_participant_select_assigned, via is_form_visible_to_participant)
    // already scopes this to forms visible to the caller.
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.from("forms").select("*");
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainForm);
  }

  async listResponsesForParticipant(accessToken: string): Promise<FormResponse[]> {
    // RLS (form_responses_participant_own) already scopes this to the caller's own rows.
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.from("form_responses").select("*");
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainFormResponse);
  }

  async getResponse(
    formId: string,
    participantId: string,
    accessToken: string
  ): Promise<FormResponse | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client
      .from("form_responses")
      .select("*")
      .eq("form_id", formId)
      .eq("participant_id", participantId)
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) return null;
    return toDomainFormResponse(row);
  }

  async createResponse(
    formId: string,
    participantId: string,
    accessToken: string
  ): Promise<FormResponse> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client
      .from("form_responses")
      .insert({ form_id: formId, participant_id: participantId })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to create response", 500);
    return toDomainFormResponse(row);
  }

  async deleteResponse(responseId: string, accessToken: string): Promise<void> {
    const client = createServerSupabaseClient(accessToken);
    const { error } = await client.from("form_responses").delete().eq("id", responseId);
    if (error) throw new UseCaseError(error.message, 500);
  }

  async listAnswersByResponse(responseId: string, accessToken: string): Promise<Answer[]> {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client
      .from("answers")
      .select("*")
      .eq("response_id", responseId);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainAnswer);
  }

  async addAnswer(
    responseId: string,
    questionId: string,
    value: AnswerValue | null,
    autoSubmittedByTimeout: boolean,
    accessToken: string
  ): Promise<Answer> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client
      .from("answers")
      .insert({
        response_id: responseId,
        question_id: questionId,
        value,
        auto_submitted_by_timeout: autoSubmittedByTimeout,
      })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to add answer", 500);
    return toDomainAnswer(row);
  }

  async advanceResponse(
    responseId: string,
    newOrder: number,
    accessToken: string
  ): Promise<FormResponse> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client
      .from("form_responses")
      .update({ current_question_order: newOrder, updated_at: new Date().toISOString() })
      .eq("id", responseId)
      .select("*")
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) throw new FormResponseNotFoundError();
    return toDomainFormResponse(row);
  }

  async completeResponse(responseId: string, accessToken: string): Promise<FormResponse> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client
      .from("form_responses")
      .update({
        status: "completed",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", responseId)
      .select("*")
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) throw new FormResponseNotFoundError();
    return toDomainFormResponse(row);
  }
}
