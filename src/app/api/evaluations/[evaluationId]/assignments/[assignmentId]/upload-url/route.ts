import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { createEvaluationObjectKey, createEvaluationUploadUrl } from "@/infrastructure/storage/seaweedfs";

type Params = { params: Promise<{ evaluationId: string; assignmentId: string }> };

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { evaluationId, assignmentId } = await params;
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const client = createServerSupabaseClient(accessToken);
    const { data: assignment, error } = await client.from("evaluation_assignments").select("participant_id").eq("id", assignmentId).eq("evaluation_id", evaluationId).single();
    if (error || !assignment) throw new UseCaseError("No se encontró la persona asignada.", 404);
    const objectKey = createEvaluationObjectKey(evaluationId, assignment.participant_id);
    return NextResponse.json({ uploadUrl: await createEvaluationUploadUrl(objectKey), objectKey });
  } catch (error) { return handleRouteError(error); }
}
