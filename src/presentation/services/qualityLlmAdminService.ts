import { axiosClient } from "./axiosClient";

export interface QualityLlmSettings { minimaxEnabled: boolean; updatedAt: string; }

export async function getQualityLlmSettings(): Promise<QualityLlmSettings> {
  return (await axiosClient.get<QualityLlmSettings>("/admin/quality-llm")).data;
}

export async function setQualityMiniMaxEnabled(minimaxEnabled: boolean): Promise<QualityLlmSettings> {
  return (await axiosClient.put<QualityLlmSettings>("/admin/quality-llm", { minimaxEnabled })).data;
}
