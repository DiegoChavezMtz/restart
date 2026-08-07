import { ForbiddenError, FormNotFoundError } from "@/application/errors";
import type { FormAssignment, FormAssignmentTargetType, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

// Implements the doc's "AssignFormToTarget" use case with "replace the full
// set" semantics: receives the complete desired list of targets and diffs
// it (via the set_form_assignments RPC) — not an incremental add/remove.
// Deliberately does NOT call assertFormEditable: assignment is orthogonal
// to the structural edit-lock (rule 3 only speaks to questions).
export async function setFormAssignments(
  repo: FormRepository,
  input: {
    formId: string;
    targets: { targetType: FormAssignmentTargetType; targetId: string }[];
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<FormAssignment[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  const seen = new Set<string>();
  const targets = input.targets.filter((target) => {
    const key = `${target.targetType}:${target.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return repo.setFormAssignments(input.formId, targets, input.adminAccessToken);
}
