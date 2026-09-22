import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { revokeBadgeAssertion } from "@/application/use-cases/badges/RevokeBadgeAssertion";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const badgeRepo = new SupabaseBadgeRepository();
    const assertion = await revokeBadgeAssertion(badgeRepo, {
      id,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(assertion);
  } catch (error) {
    return handleRouteError(error);
  }
}
