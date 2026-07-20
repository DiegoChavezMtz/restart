import type { AttendanceSession } from "@/domain/entities";

interface AttendanceSessionRow {
  id: string;
  cohort_id: string;
  session_date: string;
  created_by: string;
  created_at: string;
}

export function toDomainAttendanceSession(row: AttendanceSessionRow): AttendanceSession {
  return {
    id: row.id,
    cohortId: row.cohort_id,
    sessionDate: row.session_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
