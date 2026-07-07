import type { User, UserRole } from "@/domain/entities";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string;
  cohort_id: string | null;
  created_at: string;
}

export function toDomainUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as UserRole,
    cohortId: row.cohort_id,
    createdAt: row.created_at,
  };
}
