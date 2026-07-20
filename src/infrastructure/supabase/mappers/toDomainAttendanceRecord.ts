import type { AttendanceRecord, AttendanceStatus } from "@/domain/entities";

interface AttendanceJustificationRow {
  description: string;
  file_path: string | null;
  file_type: string | null;
}

interface AttendanceRecordRow {
  id: string;
  session_id: string;
  participant_id: string;
  status: string;
  recorded_by: string;
  recorded_at: string;
  // PostgREST embeds a to-one relation as an object, but falls back to an
  // array in some query shapes — handled defensively here.
  attendance_justifications?: AttendanceJustificationRow | AttendanceJustificationRow[] | null;
}

export function toDomainAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  const justificationRow = Array.isArray(row.attendance_justifications)
    ? (row.attendance_justifications[0] ?? null)
    : (row.attendance_justifications ?? null);

  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    status: row.status as AttendanceStatus,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at,
    justification: justificationRow
      ? {
          description: justificationRow.description,
          filePath: justificationRow.file_path,
          fileType: justificationRow.file_type,
        }
      : null,
  };
}
