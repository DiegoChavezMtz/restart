import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { createAuthSessionResponse } from "@/app/api/_lib/authSessionResponse";
import { clearRefreshCookie, REFRESH_COOKIE } from "@/app/api/_lib/refreshCookie";
import { UnauthenticatedError } from "@/application/errors";
import { refreshSession } from "@/application/use-cases/auth/RefreshSession";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) throw new UnauthenticatedError();

    const repo = new SupabaseAuthRepository();
    const session = await refreshSession(repo, refreshToken);

    return createAuthSessionResponse(session);
  } catch (error) {
    const response = handleRouteError(error);
    if (error instanceof UnauthenticatedError) clearRefreshCookie(response);
    return response;
  }
}
