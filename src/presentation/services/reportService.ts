import { axiosClient } from "./axiosClient";

export async function downloadReportPdf(cohortId: string, formId: string): Promise<void> {
  const response = await axiosClient.get("/reports/pdf", {
    params: { cohortId, formId },
    responseType: "blob",
  });
 
  const url = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "reporte.pdf";
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadQualityReport(formIds: string[]): Promise<void> {
  const response = await axiosClient.post("/quality-reports/export", { formIds }, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "reporte-evaluacion-restart.xlsx";
  anchor.click();
  URL.revokeObjectURL(url);
}
