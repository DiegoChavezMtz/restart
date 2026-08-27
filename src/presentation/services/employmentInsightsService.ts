import { axiosClient } from "./axiosClient";
import type { EmploymentInsights } from "@/application/use-cases/employability/EmploymentInsightsActions";

export async function getEmploymentInsights(): Promise<EmploymentInsights> {
  return (await axiosClient.get<EmploymentInsights>("/employment/insights")).data;
}
