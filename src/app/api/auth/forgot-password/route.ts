import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requestPasswordReset } from "@/application/use-cases/auth/RequestPasswordReset";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email } = await readJsonObject(request);
    const redirectTo = new URL("/reset-password", request.nextUrl.origin).toString();

    const repo = new SupabaseAuthRepository();
    await requestPasswordReset(repo, { email, redirectTo });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
