import { ForbiddenError } from "@/application/errors";
import type { AttendanceRecord, User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

export function listAttendanceRecords(
  repo: AttendanceRepository,
  input: { cohortId: string; requestedBy: User; adminAccessToken: string }
): Promise<AttendanceRecord[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  return repo.listRecordsByCohort(input.cohortId, input.adminAccessToken);
}
