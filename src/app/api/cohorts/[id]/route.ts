import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getCohortParticipants } from "@/application/use-cases/cohorts/GetCohortParticipants";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCohortRepository } from "@/infrastructure/supabase/repositories/SupabaseCohortRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const cohortRepo = new SupabaseCohortRepository();
    const result = await getCohortParticipants(cohortRepo, {
      cohortId: id,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
