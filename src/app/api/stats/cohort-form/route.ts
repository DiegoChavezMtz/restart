import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { UseCaseError } from "@/application/errors";
import { getCohortStatsForForm } from "@/application/use-cases/stats/GetCohortStatsForForm";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCohortRepository } from "@/infrastructure/supabase/repositories/SupabaseCohortRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";
import { SupabaseStatsRepository } from "@/infrastructure/supabase/repositories/SupabaseStatsRepository";

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
    const result = await getCohortStatsForForm(statsRepo, formRepo, cohortRepo, {
      cohortId,
      formId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
