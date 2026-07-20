import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { getBearerToken } from "@/app/api/_lib/requireUser";
import { clearRefreshCookie, REFRESH_COOKIE } from "@/app/api/_lib/refreshCookie";
import { logoutUser } from "@/application/use-cases/auth/LogoutUser";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const accessToken = getBearerToken(request) ?? "";
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value ?? null;
    const repo = new SupabaseAuthRepository();
    await logoutUser(repo, { accessToken, refreshToken });

    const response = NextResponse.json({ ok: true });
    clearRefreshCookie(response);
    return response;
  } catch (error) {
    const response = handleRouteError(error);
    clearRefreshCookie(response);
    return response;
  }
}
