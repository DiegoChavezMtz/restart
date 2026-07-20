import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { createAuthSessionResponse } from "@/app/api/_lib/authSessionResponse";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { loginUser } from "@/application/use-cases/auth/LoginUser";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, password } = await readJsonObject(request);
    const repo = new SupabaseAuthRepository();
    const session = await loginUser(repo, { email, password });

    return createAuthSessionResponse(session);
  } catch (error) {
    return handleRouteError(error);
  }
}
