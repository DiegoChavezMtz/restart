import type { Evaluation, EvaluationAssignment, EvaluationResult } from "@/domain/entities";
import { axiosClient } from "./axiosClient";

export interface ParticipantEvaluation { assignmentId: string; evaluation: Evaluation; result: EvaluationResult | null; }
export interface EvaluationDetail { evaluation: Evaluation; assignments: EvaluationAssignment[]; }

export async function listEvaluations(): Promise<Evaluation[] | ParticipantEvaluation[]> { return (await axiosClient.get("/evaluations")).data; }
export async function createEvaluation(input: { cohortId: string; title: string; description: string; periodStart: string; periodEnd: string }): Promise<{ id: string }> { return (await axiosClient.post("/evaluations", input)).data; }
export async function getEvaluation(id: string): Promise<EvaluationDetail> { return (await axiosClient.get(`/evaluations/${encodeURIComponent(id)}`)).data; }
export async function archiveEvaluation(id: string): Promise<void> { await axiosClient.patch(`/evaluations/${encodeURIComponent(id)}`); }
export async function addParticipant(evaluationId: string, participantId: string): Promise<void> { await axiosClient.post(`/evaluations/${encodeURIComponent(evaluationId)}/assignments`, { participantId }); }

function assignmentUrl(evaluationId: string, assignmentId: string) { return `/evaluations/${encodeURIComponent(evaluationId)}/assignments/${encodeURIComponent(assignmentId)}`; }
export async function uploadPdf(evaluationId: string, assignmentId: string, file: File): Promise<{ objectKey: string; fileName: string }> {
  if (file.type !== "application/pdf") throw new Error("Selecciona un archivo PDF.");
  if (file.size > 20 * 1024 * 1024) throw new Error("El PDF no puede superar 20 MB.");
  const { data } = await axiosClient.post<{ uploadUrl: string; objectKey: string }>(`${assignmentUrl(evaluationId, assignmentId)}/upload-url`);
  const response = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
  if (!response.ok) throw new Error("No se pudo cargar el PDF al almacenamiento.");
  return { objectKey: data.objectKey, fileName: file.name };
}
export async function saveResult(evaluationId: string, assignmentId: string, input: { score: number | null; objectKey: string | null; fileName: string | null; publish: boolean }): Promise<void> { await axiosClient.post(`${assignmentUrl(evaluationId, assignmentId)}/result`, input); }
export async function getDownloadUrl(evaluationId: string, assignmentId: string): Promise<{ url: string; fileName: string }> { return (await axiosClient.get(`${assignmentUrl(evaluationId, assignmentId)}/result`)).data; }

/**
 * Reserva la pestaña durante el gesto de clic, antes de esperar la API.
 * Abrirla después del await hace que Safari/Chrome la traten como popup.
 */
export async function openEvaluationPdf(evaluationId: string, assignmentId: string): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const { url } = await getDownloadUrl(evaluationId, assignmentId);
    if (tab) {
      tab.opener = null;
      tab.location.replace(url);
    } else {
      // Si el navegador bloqueó incluso la pestaña inicial, la descarga sigue
      // funcionando en la pestaña actual en lugar de perder la acción.
      window.location.assign(url);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}
