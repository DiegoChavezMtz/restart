import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { createCohort } from "@/application/use-cases/cohorts/CreateCohort";
import { listCohorts } from "@/application/use-cases/cohorts/ListCohorts";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCohortRepository } from "@/infrastructure/supabase/repositories/SupabaseCohortRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const cohortRepo = new SupabaseCohortRepository();
    const cohorts = await listCohorts(cohortRepo, {
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(cohorts);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { name, description } = await request.json();

    const cohortRepo = new SupabaseCohortRepository();
    const cohort = await createCohort(cohortRepo, {
      name,
      description: description ?? null,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(cohort);
  } catch (error) {
    return handleRouteError(error);
  }
}
