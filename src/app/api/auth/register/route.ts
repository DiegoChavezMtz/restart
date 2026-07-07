import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { setRefreshCookie } from "@/app/api/_lib/refreshCookie";
import { registerViaInvitation } from "@/application/use-cases/auth/RegisterViaInvitation";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token, email, password, fullName } = await request.json();
    const repo = new SupabaseAuthRepository();
    const session = await registerViaInvitation(repo, { token, email, password, fullName });

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
