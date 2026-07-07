import type { Form, FormResponseStatus, User } from "@/domain/entities";
import type { ResponseRepository } from "@/domain/repositories";

export interface VisibleForm {
  form: Form;
  status: "not_started" | FormResponseStatus;
}

// No role gate here (unlike the admin-side use cases): visibility is fully
// governed by is_form_visible_to_participant + RLS. Any authenticated user
// can call this — if nothing is assigned to them, they simply see an empty list.
export async function getVisibleFormsForParticipant(
  repo: ResponseRepository,
  input: { requestedBy: User; accessToken: string }
): Promise<VisibleForm[]> {
  const [forms, responses] = await Promise.all([
    repo.listVisibleForms(input.accessToken),
    repo.listResponsesForParticipant(input.accessToken),
  ]);

  const responseByFormId = new Map(responses.map((r) => [r.formId, r]));

  return forms.map((form) => ({
    form,
    status: responseByFormId.get(form.id)?.status ?? "not_started",
  }));
}
