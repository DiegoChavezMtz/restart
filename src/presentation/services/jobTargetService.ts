import type { JobTarget } from "@/domain/entities";
import { axiosClient } from "./axiosClient";
export interface JobFitMatrix { items: Array<{ requirement: string; priority: "indispensable" | "important" | "desirable"; status: "demonstrated" | "partial" | "not_demonstrated"; evidenceRefs: string[]; evidence: Array<{ id: string; type: string; label: string; content: string }>; suggestion: string }>; }
export async function listJobTargets(): Promise<JobTarget[]> { return (await axiosClient.get<JobTarget[]>("/employment/targets")).data; }
export async function getJobTarget(id: string): Promise<JobTarget> { return (await axiosClient.get<JobTarget>(`/employment/targets/${id}`)).data; }
export async function analyzeJobTarget(input: { sourceSite: string; rawText: string }): Promise<JobTarget> { return (await axiosClient.post<JobTarget>("/employment/targets", input)).data; }
export async function getJobFitMatrix(id: string): Promise<JobFitMatrix> { return (await axiosClient.get<JobFitMatrix>(`/employment/targets/${id}/fit-matrix`)).data; }
