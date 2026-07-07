import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { setRefreshCookie } from "@/app/api/_lib/refreshCookie";
import { loginUser } from "@/application/use-cases/auth/LoginUser";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, password } = await request.json();
    const repo = new SupabaseAuthRepository();
    const session = await loginUser(repo, { email, password });

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
