import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { createEvaluationDownloadUrl, isEvaluationObjectKey } from "@/infrastructure/storage/seaweedfs";

type Params = { params: Promise<{ evaluationId: string; assignmentId: string }> };

async function assignmentForRequest(evaluationId: string, assignmentId: string, accessToken: string) {
  const client = createServerSupabaseClient(accessToken);
  const { data, error } = await client.from("evaluation_assignments").select("id, participant_id, evaluation_id").eq("id", assignmentId).eq("evaluation_id", evaluationId).single();
  if (error || !data) throw new UseCaseError("No se encontró la evaluación asignada.", 404);
  return { client, assignment: data };
}

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { evaluationId, assignmentId } = await params;
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const body = await readJsonObject(request);
    const score = typeof body.score === "number" && Number.isInteger(body.score) ? body.score : null;
    const objectKey = typeof body.objectKey === "string" ? body.objectKey : null;
    const fileName = typeof body.fileName === "string" ? body.fileName.trim().slice(0, 255) : null;
    const publish = body.publish === true;
    if (score !== null && (score < 0 || score > 100)) throw new UseCaseError("La calificación debe ser un entero de 0 a 100.", 400);
    const { client, assignment } = await assignmentForRequest(evaluationId, assignmentId, accessToken);
    if (objectKey && !isEvaluationObjectKey(objectKey, evaluationId, assignment.participant_id)) throw new UseCaseError("El archivo no corresponde a esta evaluación.", 400);
    if (publish && (score === null || !objectKey || !fileName)) throw new UseCaseError("Para publicar necesitas calificación y PDF.", 400);
    const { data: id, error } = await client.rpc("save_evaluation_result", { p_assignment_id: assignmentId, p_score: score, p_object_key: objectKey, p_file_name: fileName, p_publish: publish });
    if (error || !id) throw new UseCaseError(error?.message ?? "No se pudo guardar la evaluación.", 500);
    return NextResponse.json({ id });
  } catch (error) { return handleRouteError(error); }
}

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { evaluationId, assignmentId } = await params;
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const { client, assignment } = await assignmentForRequest(evaluationId, assignmentId, accessToken);
    const admin = user.role === "admin" || user.role === "super_admin";
    if (!admin && assignment.participant_id !== user.id) throw new ForbiddenError();
    const query = client.from("evaluation_results").select("object_key, file_name, status, published_at").eq("assignment_id", assignmentId);
    const { data, error } = admin
      ? await query.order("created_at", { ascending: false }).limit(1).maybeSingle()
      : await query.eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!data?.object_key || !data.file_name) throw new UseCaseError("Aún no hay un PDF disponible.", 404);
    return NextResponse.json({ url: await createEvaluationDownloadUrl(data.object_key, data.file_name), fileName: data.file_name });
  } catch (error) { return handleRouteError(error); }
}
