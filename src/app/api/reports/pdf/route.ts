import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError"; 
import { requireUser } from "@/app/api/_lib/requireUser";
import { UseCaseError } from "@/application/errors";
import { getReportDataForCohortForm } from "@/application/use-cases/reports/GetReportDataForCohortForm";
import { generateGlobalInterpretation, generateIndividualInterpretation } from "@/infrastructure/llm/LlmInterpreter";
import { buildReportPdf } from "@/infrastructure/pdf/buildReportPdf";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCohortRepository } from "@/infrastructure/supabase/repositories/SupabaseCohortRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";
import { SupabaseStatsRepository } from "@/infrastructure/supabase/repositories/SupabaseStatsRepository";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const cohortId = request.nextUrl.searchParams.get("cohortId");
    const formId = request.nextUrl.searchParams.get("formId");
    if (!cohortId || !formId) {
      throw new UseCaseError("Missing cohortId or formId query param", 400);
    }

    const statsRepo = new SupabaseStatsRepository();
    const formRepo = new SupabaseFormRepository();
    const cohortRepo = new SupabaseCohortRepository();
    const data = await getReportDataForCohortForm(statsRepo, formRepo, cohortRepo, {
      cohortId,
      formId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    const [globalInterpretation, individualEntries] = await Promise.all([
      generateGlobalInterpretation({
        cohortName: data.cohort.name,
        formTitle: data.form.title,
        totalParticipants: data.totalParticipants,
        completionRate: data.completionRate,
        breakdown: data.breakdown,
      }),
      Promise.all(
        data.participants.map(async (entry) => {
          const interpretation = await generateIndividualInterpretation({
            participantName: entry.participant.fullName,
            formTitle: data.form.title,
            answers: entry.answers,
          });
          return [entry.participant.id, interpretation] as const;
        })
      ),
    ]);
    const individualInterpretations = new Map(individualEntries);

    const pdfBuffer = await buildReportPdf({ data, globalInterpretation, individualInterpretations });

    const safeName = `${data.cohort.name}-${data.form.title}`
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-${safeName}.pdf"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
