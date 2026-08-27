import { axiosClient } from "./axiosClient";
export interface EmploymentLlmSettings { minimaxEnabled: boolean; updatedAt: string; }
export async function getEmploymentLlmSettings(): Promise<EmploymentLlmSettings> { return (await axiosClient.get<EmploymentLlmSettings>("/admin/employment-llm")).data; }
export async function setMiniMaxEnabled(minimaxEnabled: boolean): Promise<EmploymentLlmSettings> { return (await axiosClient.put<EmploymentLlmSettings>("/admin/employment-llm", { minimaxEnabled })).data; }
