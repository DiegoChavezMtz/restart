import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { InvalidQuestionConfigError } from "@/application/errors";
import { getQualityEvaluationReport } from "@/application/use-cases/quality/GetQualityEvaluationReport";
import { generateQualityInterpretationWithMiniMax } from "@/infrastructure/llm/quality/QualityLlmGateway";
import { buildQualityEvaluationWorkbook } from "@/infrastructure/excel/buildQualityEvaluationWorkbook";
import { requireUser } from "@/app/api/_lib/requireUser";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";
import { SupabaseStatsRepository } from "@/infrastructure/supabase/repositories/SupabaseStatsRepository";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const body = await readJsonObject(request);
    if (!Array.isArray(body.formIds) || !body.formIds.every((id) => typeof id === "string")) {
      throw new InvalidQuestionConfigError("formIds debe ser una lista de identificadores.");
    }
    const report = await getQualityEvaluationReport(new SupabaseStatsRepository(), new SupabaseFormRepository(), {
      formIds: body.formIds,
      requestedBy: user,
      adminAccessToken: accessToken,
    });
    const interpretation = await generateQualityInterpretationWithMiniMax(report, accessToken)
      ?? "La interpretación asistida por IA está desactivada. El reporte conserva todas las estadísticas calculadas.";
    const workbook = await buildQualityEvaluationWorkbook({ report, interpretation });
    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="reporte-evaluacion-restart.xlsx"',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
