import type { CvBullet, CvVersion, AchievementEvidence } from "@/domain/entities";
import { cvDownloadFilename } from "@/application/cvDownloadFilename";
import { axiosClient } from "./axiosClient";
export async function listCvVersions(): Promise<CvVersion[]> { return (await axiosClient.get<CvVersion[]>("/employment/cv")).data; }
export async function generateCv(jobTargetId: string, experienceEntryIds?: string[]): Promise<CvVersion> { return (await axiosClient.post<CvVersion>("/employment/cv", { jobTargetId, experienceEntryIds })).data; }
export async function runQualityCheck(id: string): Promise<CvVersion> { return (await axiosClient.post<CvVersion>(`/employment/cv/${id}/quality-check`)).data; }
export async function markCvAsSent(id: string): Promise<CvVersion> { return (await axiosClient.post<CvVersion>(`/employment/cv/${id}/sent`)).data; }
export async function getCvVersion(id: string): Promise<CvVersion> { return (await axiosClient.get<CvVersion>(`/employment/cv/${id}`)).data; }
export async function updateCvContent(id: string, content: CvVersion["content"]): Promise<CvVersion> { return (await axiosClient.put<CvVersion>(`/employment/cv/${id}`, { content })).data; }
export async function renameCv(id: string, title: string): Promise<CvVersion> { return (await axiosClient.patch<CvVersion>(`/employment/cv/${id}`, { title })).data; }
export async function draftCvBullet(id: string, input: { experienceEntryId: string; claim: string; metricValue: string | null; metricConfirmedByUser: boolean }): Promise<{ bullets: CvBullet[]; evidence: AchievementEvidence }> { return (await axiosClient.post<{ bullets: CvBullet[]; evidence: AchievementEvidence }>(`/employment/cv/${id}/bullets/draft`, input)).data; }
export interface CvSummaryAlternative { headline: string; summary: string; }
export async function getCvSummaryAlternatives(id: string): Promise<CvSummaryAlternative[]> { return (await axiosClient.get<{ alternatives: CvSummaryAlternative[] }>(`/employment/cv/${id}/summary`)).data.alternatives; }
export async function applyCvSummaryAlternative(id: string, alternative: CvSummaryAlternative): Promise<CvVersion> { return (await axiosClient.put<CvVersion>(`/employment/cv/${id}/summary`, alternative)).data; }
async function downloadCv(id: string, format: "pdf" | "word", fullName: string): Promise<void> { const response = await axiosClient.get(`/employment/cv/${id}/${format}`, { responseType: "blob" }); const url = URL.createObjectURL(response.data as Blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = cvDownloadFilename(fullName, format === "word" ? "docx" : "pdf"); anchor.click(); URL.revokeObjectURL(url); }
export async function downloadCvPdf(id: string, fullName: string): Promise<void> { return downloadCv(id, "pdf", fullName); }
export async function downloadCvWord(id: string, fullName: string): Promise<void> { return downloadCv(id, "word", fullName); }
