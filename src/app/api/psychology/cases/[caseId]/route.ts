import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ caseId: string }> };
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "psicologa" && user.role !== "super_admin") throw new ForbiddenError();
    const { caseId } = await params;
    const { data, error } = await createServerSupabaseClient(accessToken).rpc("read_sensitive_participant_case", { p_case_id: caseId });
    if (error) throw new UseCaseError(error.message, 403);
    return NextResponse.json(data);
  } catch (error) { return handleRouteError(error); }
}
