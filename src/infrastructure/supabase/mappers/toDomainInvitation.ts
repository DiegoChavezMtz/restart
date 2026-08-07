import type { Invitation } from "@/domain/entities";

interface InvitationRow {
  id: string;
  token: string;
  cohort_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  intended_role: "usuario" | "test";
}

export function toDomainInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    token: row.token,
    cohortId: row.cohort_id,
    createdBy: row.created_by,
    isActive: row.is_active,
    createdAt: row.created_at,
    intendedRole: row.intended_role,
  };
}
