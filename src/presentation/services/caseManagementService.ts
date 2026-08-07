import { axiosClient } from "./axiosClient";

export interface OperationalCase { id: string; participant_id: string; title: string; status: "open" | "closed"; is_sensitive: boolean; created_at: string; updated_at: string; }

export async function listOperationalCases(): Promise<OperationalCase[]> {
  const { data } = await axiosClient.get<OperationalCase[]>("/cases");
  return data;
}

export async function createCase(input: { participantId: string; title: string; isSensitive: boolean; psychologistId?: string }): Promise<{ id: string }> {
  const { data } = await axiosClient.post<{ id: string }>("/cases", input);
  return data;
}

export async function setPsychologistAssignment(caseId: string, psychologistId: string, assigned: boolean): Promise<void> {
  await axiosClient.patch(`/cases/${encodeURIComponent(caseId)}/assignment`, { psychologistId, assigned });
}
