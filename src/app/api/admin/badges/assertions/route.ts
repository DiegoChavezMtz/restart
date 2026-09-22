import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { InvalidBadgeInputError } from "@/application/errors";
import { issueBadgeAssertion } from "@/application/use-cases/badges/IssueBadgeAssertion";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const body = await request.json().catch(() => null);
    const badgeClassId = body?.badgeClassId;
    const recipientIds = body?.recipientIds;
    if (typeof badgeClassId !== "string" || !Array.isArray(recipientIds)) {
      throw new InvalidBadgeInputError("badgeClassId and recipientIds[] are required.");
    }

    const badgeRepo = new SupabaseBadgeRepository();
    const assertions = await issueBadgeAssertion(badgeRepo, {
      badgeClassId,
      recipientIds,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(assertions, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
