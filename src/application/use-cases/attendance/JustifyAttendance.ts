import { ForbiddenError, InvalidAttendanceInputError } from "@/application/errors";
import type { AttendanceRecord, User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

const ALLOWED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export function justifyAttendance(
  repo: AttendanceRepository,
  input: {
    sessionId: string;
    participantId: string;
    description: string;
    file: File | null;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<AttendanceRecord> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const description = input.description.trim();
  if (!description) {
    throw new InvalidAttendanceInputError("description is required.");
  }
  if (input.file && !ALLOWED_FILE_TYPES.includes(input.file.type)) {
    throw new InvalidAttendanceInputError(
      "file must be one of: application/pdf, image/png, image/jpeg."
    );
  }

  return repo.justify(
    {
      sessionId: input.sessionId,
      participantId: input.participantId,
      description,
      file: input.file,
    },
    input.adminAccessToken
  );
}
