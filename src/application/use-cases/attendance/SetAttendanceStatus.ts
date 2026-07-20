import { ForbiddenError, InvalidAttendanceInputError } from "@/application/errors";
import type { AttendanceRecord, AttendanceStatus, User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

const PLAIN_STATUSES: AttendanceStatus[] = ["asistio", "retardo", "falta"];
type PlainAttendanceStatus = "asistio" | "retardo" | "falta";

function isPlainStatus(status: unknown): status is PlainAttendanceStatus {
  return typeof status === "string" && PLAIN_STATUSES.includes(status as AttendanceStatus);
}

export function setAttendanceStatus(
  repo: AttendanceRepository,
  input: {
    sessionId: string;
    participantId: string;
    status: unknown;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<AttendanceRecord> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  if (!isPlainStatus(input.status)) {
    throw new InvalidAttendanceInputError(
      'status must be one of "asistio", "retardo", "falta" — use the justify endpoint for "justificado".'
    );
  }

  return repo.setStatus(
    input.sessionId,
    input.participantId,
    input.status,
    input.requestedBy.id,
    input.adminAccessToken
  );
}
