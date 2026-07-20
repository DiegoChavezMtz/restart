import { NextResponse } from "next/server";
import type { AuthSession } from "@/domain/repositories";
import { setRefreshCookie } from "./refreshCookie";

export function createAuthSessionResponse(session: AuthSession): NextResponse {
  const response = NextResponse.json({
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    user: session.user,
  });
  response.headers.set("Cache-Control", "no-store");
  setRefreshCookie(response, session.refreshToken);
  return response;
}
