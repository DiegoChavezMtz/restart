import type { Cohort } from "@/domain/entities";

interface CohortRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export function toDomainCohort(row: CohortRow): Cohort {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  };
}
