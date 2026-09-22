import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type Params = { params: Promise<{ evaluationId: string }> };
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { evaluationId } = await params; const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const { participantId } = await readJsonObject(request);
    if (typeof participantId !== "string") throw new UseCaseError("Selecciona una persona.", 400);
    const { error } = await createServerSupabaseClient(accessToken).rpc("add_evaluation_participant", { p_evaluation_id: evaluationId, p_participant_id: participantId });
    if (error) throw new UseCaseError(error.message, 400);
    return new NextResponse(null, { status: 204 });
  } catch (error) { return handleRouteError(error); }
}
