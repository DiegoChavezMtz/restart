import { FormEditLockedError } from "@/application/errors";
import type { FormRepository } from "@/domain/repositories";

/**
 * Shared structural-edit guard (docs/CONSTITUCION.md rule 3): a form with
 * responses is locked for AddQuestion/UpdateQuestion/DeleteQuestion/
 * ReorderQuestions. This file has no exported verb function of its own —
 * "EditFormQuestions" from the doc's use-case list is really this guard,
 * shared by the four question-mutation use cases in their own files.
 */
export async function assertFormEditable(
  repo: FormRepository,
  formId: string,
  adminAccessToken: string
): Promise<void> {
  const count = await repo.countResponsesByForm(formId, adminAccessToken);
  if (count > 0) throw new FormEditLockedError();
}
