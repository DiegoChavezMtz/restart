import { ForbiddenError } from "@/application/errors";
import type { AttendanceSession, User } from "@/domain/entities";
import type { AttendanceRepository } from "@/domain/repositories";

const RECENT_SESSION_COUNT = 10;

/** Pure — los últimos N días hábiles (lun-vie) terminando hoy, más antiguo primero. */
export function computeRecentWeekdayDates(
  count = RECENT_SESSION_COUNT,
  referenceDate = new Date()
): string[] {
  const dates: string[] = [];
  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);

  while (dates.length < count) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return dates.reverse();
}

// Crea (idempotente) las sesiones de los últimos 10 días hábiles de una
// generación que aún no existan, y regresa la lista completa. Reemplaza al
// autogenerado en memoria que tenía el prototipo — mismo comportamiento
// visible, ahora persistido.
export async function ensureRecentAttendanceSessions(
  repo: AttendanceRepository,
  input: { cohortId: string; requestedBy: User; adminAccessToken: string }
): Promise<AttendanceSession[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const dates = computeRecentWeekdayDates();
  await Promise.all(
    dates.map((date) =>
      repo.ensureSession(input.cohortId, date, input.requestedBy.id, input.adminAccessToken)
    )
  );

  return repo.listSessionsByCohort(input.cohortId, input.adminAccessToken);
}
