import { ForbiddenError, FormNotFoundError, InvalidFormSkillError } from "@/application/errors";
import type { FormSkill, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";
import { assertFormEditable } from "./EditFormQuestions";

export async function createFormSkill(
  repo: FormRepository,
  input: {
    formId: string;
    name: string;
    description: string | null;
    icon?: string;
    color?: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<FormSkill> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  const name = input.name.trim();
  if (name.length === 0) throw new InvalidFormSkillError("name no puede estar vacío.");

  return repo.createFormSkill(
    {
      formId: input.formId,
      name,
      description: input.description,
      icon: input.icon,
      color: input.color,
    },
    input.adminAccessToken
  );
}
