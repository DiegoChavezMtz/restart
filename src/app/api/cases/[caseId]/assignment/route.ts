import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ caseId: string }> };
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const { caseId } = await params; const { psychologistId, assigned } = await request.json();
    if (typeof psychologistId !== "string" || typeof assigned !== "boolean") throw new UseCaseError("Asignación inválida", 400);
    const rpc = assigned ? "assign_psicologa_to_case" : "unassign_psicologa_from_case";
    const { error } = await createServerSupabaseClient(accessToken).rpc(rpc, { p_case_id: caseId, p_psicologa_id: psychologistId });
    if (error) throw new UseCaseError(error.message, 403);
    return NextResponse.json({ ok: true });
  } catch (error) { return handleRouteError(error); }
}
