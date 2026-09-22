import { axiosClient } from "./axiosClient";

export type ParticipantAttendanceStatus = "asistio" | "retardo" | "falta" | "justificado" | "sin_registro";

export interface ParticipantAttendanceSession {
  id: string;
  date: string;
  status: ParticipantAttendanceStatus;
  justificationDescription: string | null;
}

export interface ParticipantAttendanceSummary {
  present: number;
  late: number;
  absent: number;
  justified: number;
  unrecorded: number;
  totalSessions: number;
  derivedAbsences: number;
}

export interface ParticipantAttendance {
  available: boolean;
  periodStart: string;
  sessions: ParticipantAttendanceSession[];
  summary: ParticipantAttendanceSummary | null;
}

export async function getMyAttendance(): Promise<ParticipantAttendance> {
  const { data } = await axiosClient.get<ParticipantAttendance>("/attendance/mine");
  return data;
}
