import { ForbiddenError } from "@/application/errors";
import type { AttendanceSession, User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

export function listAttendanceSessions(
  repo: AttendanceRepository,
  input: { cohortId: string; requestedBy: User; adminAccessToken: string }
): Promise<AttendanceSession[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  return repo.listSessionsByCohort(input.cohortId, input.adminAccessToken);
}
