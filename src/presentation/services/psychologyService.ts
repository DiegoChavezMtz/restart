import { axiosClient } from "./axiosClient";

export interface PsychologicalCaseSummary { id: string; participant_id: string; participant_name: string; title: string; status: "open" | "closed"; updated_at: string; }
export async function listCases(): Promise<PsychologicalCaseSummary[]> { const { data } = await axiosClient.get<PsychologicalCaseSummary[]>("/psychology/cases"); return data; }
export async function readCase(id: string): Promise<Record<string, unknown>> { const { data } = await axiosClient.get<Record<string, unknown>>(`/psychology/cases/${encodeURIComponent(id)}`); return data; }
export async function addOpenTextQuestion(formId: string, label: string): Promise<void> { await axiosClient.post(`/psychology/forms/${encodeURIComponent(formId)}/questions`, { label }); }
