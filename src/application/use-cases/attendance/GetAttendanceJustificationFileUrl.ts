import { ForbiddenError } from "@/application/errors";
import type { User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

export function getAttendanceJustificationFileUrl(
  repo: AttendanceRepository,
  input: {
    sessionId: string;
    participantId: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<{ url: string; fileType: string } | null> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  return repo.getJustificationFileUrl(
    input.sessionId,
    input.participantId,
    input.adminAccessToken
  );
}
