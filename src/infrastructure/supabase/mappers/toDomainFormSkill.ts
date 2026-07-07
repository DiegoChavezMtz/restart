import type { FormSkill } from "@/domain/entities";

interface FormSkillRow {
  id: string;
  form_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export function toDomainFormSkill(row: FormSkillRow): FormSkill {
  return {
    id: row.id,
    formId: row.form_id,
    name: row.name,
    description: row.description,
    icon: row.icon ?? undefined,
    color: row.color ?? undefined,
  };
}
