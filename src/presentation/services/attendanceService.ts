import type { AttendanceRecord, AttendanceSession, AttendanceStatus } from "@/domain/entities";
import { axiosClient } from "./axiosClient";

export async function ensureRecentSessions(cohortId: string): Promise<AttendanceSession[]> {
  const { data } = await axiosClient.post<AttendanceSession[]>("/attendance/sessions/ensure-recent", {
    cohortId,
  });
  return data;
}

export async function listRecords(cohortId: string): Promise<AttendanceRecord[]> {
  const { data } = await axiosClient.get<AttendanceRecord[]>("/attendance/records", {
    params: { cohortId },
  });
  return data;
}

function recordUrl(sessionId: string, participantId: string): string {
  return `/attendance/sessions/${encodeURIComponent(sessionId)}/records/${encodeURIComponent(participantId)}`;
}

export async function setAttendanceStatus(
  sessionId: string,
  participantId: string,
  status: Exclude<AttendanceStatus, "justificado">
): Promise<AttendanceRecord> {
  const { data } = await axiosClient.patch<AttendanceRecord>(recordUrl(sessionId, participantId), {
    status,
  });
  return data;
}

export async function clearAttendanceStatus(sessionId: string, participantId: string): Promise<void> {
  await axiosClient.delete(recordUrl(sessionId, participantId));
}

export async function justifyAttendance(
  sessionId: string,
  participantId: string,
  description: string,
  file: File | null
): Promise<AttendanceRecord> {
  const form = new FormData();
  form.set("description", description);
  if (file) form.set("file", file);

  const { data } = await axiosClient.patch<AttendanceRecord>(
    `${recordUrl(sessionId, participantId)}/justify`,
    form
  );
  return data;
}

export async function removeJustification(
  sessionId: string,
  participantId: string
): Promise<AttendanceRecord> {
  const { data } = await axiosClient.delete<AttendanceRecord>(
    `${recordUrl(sessionId, participantId)}/justify`
  );
  return data;
}

export async function getJustificationFileUrl(
  sessionId: string,
  participantId: string
): Promise<{ url: string; fileType: string } | null> {
  const { data } = await axiosClient.get<{ url: string; fileType: string } | null>(
    `${recordUrl(sessionId, participantId)}/justify`
  );
  return data;
}
