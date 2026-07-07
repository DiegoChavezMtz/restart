import { FormSkillNotFoundError, QuestionNotFoundError, UseCaseError } from "@/application/errors";
import type {
  Form,
  FormAssignment,
  FormAssignmentTargetType,
  FormSkill,
  FormStatus,
  Question,
  QuestionSkillWeight,
} from "@/domain/entities";
import type {
  CreateFormInput,
  CreateFormSkillInput,
  CreateQuestionInput,
  FormRepository,
  SetQuestionSkillWeightInput,
  UpdateFormDetailsInput,
  UpdateFormSkillInput,
  UpdateQuestionInput,
} from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainForm } from "@/infrastructure/supabase/mappers/toDomainForm";
import { toDomainFormAssignment } from "@/infrastructure/supabase/mappers/toDomainFormAssignment";
import { toDomainFormSkill } from "@/infrastructure/supabase/mappers/toDomainFormSkill";
import { toDomainQuestion } from "@/infrastructure/supabase/mappers/toDomainQuestion";
import { toDomainQuestionSkillWeight } from "@/infrastructure/supabase/mappers/toDomainQuestionSkillWeight";

export class SupabaseFormRepository implements FormRepository {
  async createForm(input: CreateFormInput, adminAccessToken: string): Promise<Form> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("forms")
      .insert({
        title: input.title,
        description: input.description,
        created_by: input.createdBy,
      })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to create form", 500);
    return toDomainForm(row);
  }

  async listForms(adminAccessToken: string): Promise<Form[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainForm);
  }

  async getFormById(formId: string, adminAccessToken: string): Promise<Form | null> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("forms")
      .select("*")
      .eq("id", formId)
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) return null;
    return toDomainForm(row);
  }

  async updateFormDetails(
    formId: string,
    input: UpdateFormDetailsInput,
    adminAccessToken: string
  ): Promise<Form> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("forms")
      .update({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.allowsPartialSave !== undefined && {
          allows_partial_save: input.allowsPartialSave,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId)
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to update form", 500);
    return toDomainForm(row);
  }

  async setFormStatus(
    formId: string,
    status: FormStatus,
    adminAccessToken: string
  ): Promise<Form> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("forms")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", formId)
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to update form status", 500);
    return toDomainForm(row);
  }

  async setAcceptingResponses(
    formId: string,
    acceptingResponses: boolean,
    adminAccessToken: string
  ): Promise<Form> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("forms")
      .update({ accepting_responses: acceptingResponses, updated_at: new Date().toISOString() })
      .eq("id", formId)
      .select("*")
      .single();
    if (error || !row) {
      throw new UseCaseError(error?.message ?? "Failed to update accepting responses", 500);
    }
    return toDomainForm(row);
  }

  async listQuestionsByForm(formId: string, adminAccessToken: string): Promise<Question[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("questions")
      .select("*")
      .eq("form_id", formId)
      .order("order", { ascending: true });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainQuestion);
  }

  async getQuestionById(
    formId: string,
    questionId: string,
    adminAccessToken: string
  ): Promise<Question | null> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .eq("form_id", formId)
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) return null;
    return toDomainQuestion(row);
  }

  async addQuestion(input: CreateQuestionInput, adminAccessToken: string): Promise<Question> {
    const client = createServerSupabaseClient(adminAccessToken);

    const { count, error: countError } = await client
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("form_id", input.formId);
    if (countError) throw new UseCaseError(countError.message, 500);

    const { data: row, error } = await client
      .from("questions")
      .insert({
        form_id: input.formId,
        order: count ?? 0,
        label: input.label,
        type: input.type,
        config: input.config,
        required: input.required,
        time_limit_seconds: input.timeLimitSeconds,
      })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to add question", 500);
    return toDomainQuestion(row);
  }

  async updateQuestion(
    formId: string,
    questionId: string,
    input: UpdateQuestionInput,
    adminAccessToken: string
  ): Promise<Question> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("questions")
      .update({
        ...(input.label !== undefined && { label: input.label }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.config !== undefined && { config: input.config }),
        ...(input.required !== undefined && { required: input.required }),
        ...(input.timeLimitSeconds !== undefined && { time_limit_seconds: input.timeLimitSeconds }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId)
      .eq("form_id", formId)
      .select("*")
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) throw new QuestionNotFoundError();
    return toDomainQuestion(row);
  }

  async deleteQuestion(
    formId: string,
    questionId: string,
    adminAccessToken: string
  ): Promise<void> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error, count } = await client
      .from("questions")
      .delete({ count: "exact" })
      .eq("id", questionId)
      .eq("form_id", formId);
    if (error) throw new UseCaseError(error.message, 500);
    if (!count) throw new QuestionNotFoundError();
  }

  async reorderQuestions(
    formId: string,
    orderedQuestionIds: string[],
    adminAccessToken: string
  ): Promise<Question[]> {
    const client = createServerSupabaseClient(adminAccessToken);

    const { data: existing, error: existingError } = await client
      .from("questions")
      .select("id")
      .eq("form_id", formId);
    if (existingError) throw new UseCaseError(existingError.message, 500);

    const existingIds = new Set((existing ?? []).map((row) => row.id));
    const incomingIds = new Set(orderedQuestionIds);
    const isSameSet =
      existingIds.size === incomingIds.size &&
      [...existingIds].every((id) => incomingIds.has(id));
    if (!isSameSet) {
      throw new UseCaseError("orderedQuestionIds must match the form's existing questions", 400);
    }

    const { error: rpcError } = await client.rpc("reorder_questions", {
      p_form_id: formId,
      p_question_ids: orderedQuestionIds,
    });
    if (rpcError) throw new UseCaseError(rpcError.message, 500);

    return this.listQuestionsByForm(formId, adminAccessToken);
  }

  async countResponsesByForm(formId: string, adminAccessToken: string): Promise<number> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { count, error } = await client
      .from("form_responses")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId);
    if (error) throw new UseCaseError(error.message, 500);
    return count ?? 0;
  }

  async listFormSkills(formId: string, adminAccessToken: string): Promise<FormSkill[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("form_skills")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: true });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainFormSkill);
  }

  async createFormSkill(input: CreateFormSkillInput, adminAccessToken: string): Promise<FormSkill> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("form_skills")
      .insert({
        form_id: input.formId,
        name: input.name,
        description: input.description,
        icon: input.icon ?? null,
        color: input.color ?? null,
      })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to create form skill", 500);
    return toDomainFormSkill(row);
  }

  async updateFormSkill(
    formId: string,
    skillId: string,
    input: UpdateFormSkillInput,
    adminAccessToken: string
  ): Promise<FormSkill> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("form_skills")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.color !== undefined && { color: input.color }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", skillId)
      .eq("form_id", formId)
      .select("*")
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) throw new FormSkillNotFoundError();
    return toDomainFormSkill(row);
  }

  async deleteFormSkill(formId: string, skillId: string, adminAccessToken: string): Promise<void> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error, count } = await client
      .from("form_skills")
      .delete({ count: "exact" })
      .eq("id", skillId)
      .eq("form_id", formId);
    if (error) throw new UseCaseError(error.message, 500);
    if (!count) throw new FormSkillNotFoundError();
  }

  async listQuestionSkillWeightsByForm(
    formId: string,
    adminAccessToken: string
  ): Promise<QuestionSkillWeight[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("question_skill_weights")
      .select("*, questions!inner(form_id)")
      .eq("questions.form_id", formId);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainQuestionSkillWeight);
  }

  async setQuestionSkillWeight(
    _formId: string,
    questionId: string,
    input: SetQuestionSkillWeightInput,
    adminAccessToken: string
  ): Promise<QuestionSkillWeight> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("question_skill_weights")
      .upsert(
        { question_id: questionId, skill_id: input.skillId, weight: input.weight, updated_at: new Date().toISOString() },
        { onConflict: "question_id" }
      )
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to set skill weight", 500);
    return toDomainQuestionSkillWeight(row);
  }

  async clearQuestionSkillWeight(
    _formId: string,
    questionId: string,
    adminAccessToken: string
  ): Promise<void> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error } = await client
      .from("question_skill_weights")
      .delete()
      .eq("question_id", questionId);
    if (error) throw new UseCaseError(error.message, 500);
  }

  async listFormAssignments(formId: string, adminAccessToken: string): Promise<FormAssignment[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("form_assignments")
      .select("*")
      .eq("form_id", formId);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainFormAssignment);
  }

  async setFormAssignments(
    formId: string,
    targets: { targetType: FormAssignmentTargetType; targetId: string }[],
    adminAccessToken: string
  ): Promise<FormAssignment[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error } = await client.rpc("set_form_assignments", {
      p_form_id: formId,
      p_targets: targets,
    });
    if (error) throw new UseCaseError(error.message, 500);
    return this.listFormAssignments(formId, adminAccessToken);
  }

  async duplicateForm(
    formId: string,
    input: { createdBy: string },
    adminAccessToken: string
  ): Promise<Form> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: newFormId, error } = await client.rpc("duplicate_form", {
      p_form_id: formId,
      p_created_by: input.createdBy,
    });
    if (error || !newFormId) {
      throw new UseCaseError(error?.message ?? "Failed to duplicate form", 500);
    }
    const newForm = await this.getFormById(newFormId, adminAccessToken);
    if (!newForm) throw new UseCaseError("Duplicated form not found after creation", 500);
    return newForm;
  }
}
