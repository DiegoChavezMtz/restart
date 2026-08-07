import { AttendanceRecordNotFoundError, ForbiddenError } from "@/application/errors";
import type { AttendanceRecord, User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

// El registro vuelve a 'falta' — una falta es el único origen posible de un
// 'justificado' (ver supabase/sql/014_attendance.sql, remove_attendance_justification).
export async function removeAttendanceJustification(
  repo: AttendanceRepository,
  input: {
    sessionId: string;
    participantId: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<AttendanceRecord> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const existing = await repo.getRecord(
    input.sessionId,
    input.participantId,
    input.adminAccessToken
  );
  if (!existing) throw new AttendanceRecordNotFoundError();

  return repo.removeJustification(input.sessionId, input.participantId, input.adminAccessToken);
}
