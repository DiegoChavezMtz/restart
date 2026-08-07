import { UseCaseError } from "@/application/errors";
import type { Answer, Form, FormResponse } from "@/domain/entities";
import type { ResponseRepository } from "@/domain/repositories";
import type { AnswerValue } from "@/domain/value-objects";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainAnswer } from "@/infrastructure/supabase/mappers/toDomainAnswer";
import { toDomainForm } from "@/infrastructure/supabase/mappers/toDomainForm";
import { toDomainFormResponse } from "@/infrastructure/supabase/mappers/toDomainFormResponse";

export class SupabaseResponseRepository implements ResponseRepository {
  async resumeParticipantResponse(formId: string, accessToken: string): Promise<FormResponse> {
    const client = createServerSupabaseClient(accessToken);
    const { data: responseId, error } = await client.rpc("resume_participant_form_response", {
      p_form_id: formId,
    });
    if (error || !responseId) {
      throw new UseCaseError(error?.message ?? "Failed to resume form response", 409);
    }

    const { data: row, error: responseError } = await client
      .from("form_responses")
      .select("*")
      .eq("id", responseId)
      .single();
    if (responseError || !row) {
      throw new UseCaseError(responseError?.message ?? "Failed to load form response", 500);
    }
    return toDomainFormResponse(row);
  }

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

  async listAnswersByResponse(responseId: string, accessToken: string): Promise<Answer[]> {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client
      .from("answers")
      .select("*")
      .eq("response_id", responseId);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainAnswer);
  }

  async submitParticipantAnswerAndAdvance(
    responseId: string,
    questionId: string,
    value: AnswerValue | null,
    autoSubmittedByTimeout: boolean,
    accessToken: string
  ): Promise<string | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.rpc("submit_participant_form_answer", {
      p_response_id: responseId,
      p_question_id: questionId,
      p_value: value,
      p_auto_submitted_by_timeout: autoSubmittedByTimeout,
    });
    if (error) throw new UseCaseError(error.message, 409);
    return data;
  }
}
