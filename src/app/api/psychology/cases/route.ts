import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "psicologa" && user.role !== "super_admin") throw new ForbiddenError();
    const { data, error } = await createServerSupabaseClient(accessToken).rpc("list_assigned_psychological_cases");
    if (error) throw new UseCaseError(error.message, 403);
    return NextResponse.json(data ?? []);
  } catch (error) { return handleRouteError(error); }
}
