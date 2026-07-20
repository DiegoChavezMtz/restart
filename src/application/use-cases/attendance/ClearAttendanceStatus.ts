import { ForbiddenError } from "@/application/errors";
import type { User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

export function clearAttendanceStatus(
  repo: AttendanceRepository,
  input: {
    sessionId: string;
    participantId: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<void> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  return repo.clearStatus(input.sessionId, input.participantId, input.adminAccessToken);
}
