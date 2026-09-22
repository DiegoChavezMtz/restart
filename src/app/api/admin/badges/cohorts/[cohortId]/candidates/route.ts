import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { InvalidBadgeInputError } from "@/application/errors";
import { listCohortCandidatesForBadge } from "@/application/use-cases/badges/ListCohortCandidatesForBadge";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";
import { SupabaseCohortRepository } from "@/infrastructure/supabase/repositories/SupabaseCohortRepository";

type RouteParams = { params: Promise<{ cohortId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { cohortId } = await params;
    const badgeClassId = request.nextUrl.searchParams.get("badgeClassId");
    if (!badgeClassId) throw new InvalidBadgeInputError("badgeClassId query param is required.");

    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const result = await listCohortCandidatesForBadge(
      { badgeRepo: new SupabaseBadgeRepository(), cohortRepo: new SupabaseCohortRepository() },
      { cohortId, badgeClassId, requestedBy: user, adminAccessToken: accessToken }
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
