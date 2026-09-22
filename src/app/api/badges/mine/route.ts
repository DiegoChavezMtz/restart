import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { listMyBadgeAssertions } from "@/application/use-cases/badges/ListMyBadgeAssertions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { accessToken } = await requireUser(request, authRepo);

    const badgeRepo = new SupabaseBadgeRepository();
    const assertions = await listMyBadgeAssertions(badgeRepo, { accessToken });

    return NextResponse.json(assertions);
  } catch (error) {
    return handleRouteError(error);
  }
}
