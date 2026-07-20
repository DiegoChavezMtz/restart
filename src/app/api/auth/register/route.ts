import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { createAuthSessionResponse } from "@/app/api/_lib/authSessionResponse";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { registerViaInvitation } from "@/application/use-cases/auth/RegisterViaInvitation";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token, email, password, fullName } = await readJsonObject(request);
    const repo = new SupabaseAuthRepository();
    const session = await registerViaInvitation(repo, { token, email, password, fullName });

    return createAuthSessionResponse(session);
  } catch (error) {
    return handleRouteError(error);
  }
}
