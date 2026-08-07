import { ForbiddenError, FormNotFoundError, InvalidFormSkillError } from "@/application/errors";
import type { FormSkill, User } from "@/domain/entities";
import type { FormRepository, UpdateFormSkillInput } from "@/domain/repositories";
import { assertFormEditable } from "./EditFormQuestions";

export async function updateFormSkill(
  repo: FormRepository,
  input: UpdateFormSkillInput & {
    formId: string;
    skillId: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<FormSkill> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new InvalidFormSkillError("name no puede estar vacío.");
  }

  return repo.updateFormSkill(
    input.formId,
    input.skillId,
    {
      name: input.name?.trim(),
      description: input.description,
      icon: input.icon,
      color: input.color,
    },
    input.adminAccessToken
  );
}
