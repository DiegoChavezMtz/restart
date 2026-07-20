import type { AttendanceRecord, AttendanceSession, User } from "@/domain/entities";

// Cada 3 retardos cuentan como una falta adicional en las estadísticas del
// concentrado — los retardos crudos nunca se descuentan ni se reetiquetan.
const RETARDOS_POR_FALTA = 3;

export interface UserAttendanceSummary {
  userId: string;
  present: number;
  late: number;
  absent: number;
  justified: number;
  derivedAbsences: number;
  effectiveAbsent: number;
  totalDays: number;
  attendanceRate: number;
}

export function computeUserAttendanceSummary(
  participantId: string,
  sessions: AttendanceSession[],
  records: AttendanceRecord[]
): UserAttendanceSummary {
  const statusBySessionId = new Map(
    records.filter((r) => r.participantId === participantId).map((r) => [r.sessionId, r.status])
  );

  let present = 0;
  let late = 0;
  let absent = 0;
  let justified = 0;

  for (const session of sessions) {
    const status = statusBySessionId.get(session.id);
    if (status === "asistio") present += 1;
    else if (status === "retardo") late += 1;
    else if (status === "falta") absent += 1;
    else if (status === "justificado") justified += 1;
  }

  const derivedAbsences = Math.floor(late / RETARDOS_POR_FALTA);
  const effectiveAbsent = absent + derivedAbsences;
  const totalDays = sessions.length;
  const attendanceRate =
    totalDays === 0 ? 0 : Math.round(((totalDays - effectiveAbsent) / totalDays) * 100);

  return {
    userId: participantId,
    present,
    late,
    absent,
    justified,
    derivedAbsences,
    effectiveAbsent,
    totalDays,
    attendanceRate,
  };
}

export interface CohortAttendanceSummary {
  totalSessions: number;
  totalPresent: number;
  totalLate: number;
  totalJustified: number;
  totalAbsent: number;
  totalDerivedAbsences: number;
  averageAttendanceRate: number;
}

export function computeCohortAttendanceSummary(
  participants: User[],
  sessions: AttendanceSession[],
  records: AttendanceRecord[]
): CohortAttendanceSummary {
  const perUser = participants.map((p) => computeUserAttendanceSummary(p.id, sessions, records));

  const totalPresent = perUser.reduce((sum, u) => sum + u.present, 0);
  const totalLate = perUser.reduce((sum, u) => sum + u.late, 0);
  const totalJustified = perUser.reduce((sum, u) => sum + u.justified, 0);
  const totalAbsent = perUser.reduce((sum, u) => sum + u.effectiveAbsent, 0);
  const totalDerivedAbsences = perUser.reduce((sum, u) => sum + u.derivedAbsences, 0);
  const averageAttendanceRate =
    perUser.length === 0
      ? 0
      : Math.round(perUser.reduce((sum, u) => sum + u.attendanceRate, 0) / perUser.length);

  return {
    totalSessions: sessions.length,
    totalPresent,
    totalLate,
    totalJustified,
    totalAbsent,
    totalDerivedAbsences,
    averageAttendanceRate,
  };
}
