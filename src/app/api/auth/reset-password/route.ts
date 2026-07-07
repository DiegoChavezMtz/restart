import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { setRefreshCookie } from "@/app/api/_lib/refreshCookie";
import { resetPassword } from "@/application/use-cases/auth/ResetPassword";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token, newPassword } = await request.json();
    const repo = new SupabaseAuthRepository();
    const session = await resetPassword(repo, { tokenHash: token, newPassword });

    const response = NextResponse.json({
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      user: session.user,
    });
    setRefreshCookie(response, session.refreshToken);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
