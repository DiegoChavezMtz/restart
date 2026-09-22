import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type Params = { params: Promise<{ evaluationId: string }> };
const assertAdmin = (role: string) => { if (role !== "admin" && role !== "super_admin") throw new ForbiddenError(); };
type ResultRow = { id: string; version: number; status: "draft" | "published"; score: number | null; file_name: string | null; published_at: string | null };
type AssignmentRow = { id: string; evaluation_id: string; participant_id: string; assigned_at: string; users: { full_name: string; email: string } | null; evaluation_results?: ResultRow[] };

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { evaluationId } = await params; const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); assertAdmin(user.role);
    const client = createServerSupabaseClient(accessToken);
    const { data: evaluation, error } = await client.from("evaluations").select("*, cohorts(name)").eq("id", evaluationId).single();
    if (error || !evaluation) throw new UseCaseError("No se encontró la evaluación.", 404);
    const { data: assignments, error: assignmentsError } = await client.from("evaluation_assignments").select("id, evaluation_id, participant_id, assigned_at, users(full_name, email), evaluation_results(id, version, status, score, file_name, published_at)").eq("evaluation_id", evaluationId).order("assigned_at");
    if (assignmentsError) throw new UseCaseError(assignmentsError.message, 500);
    const mapped = ((assignments ?? []) as unknown as AssignmentRow[]).map((assignment) => {
      const results = assignment.evaluation_results ?? [];
      const published = results.filter((item) => item.status === "published").sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0] ?? null;
      const draft = results.find((item) => item.status === "draft") ?? null;
      return { id: assignment.id, evaluationId: assignment.evaluation_id, participantId: assignment.participant_id, participantName: assignment.users?.full_name, participantEmail: assignment.users?.email, assignedAt: assignment.assigned_at, result: published, draft };
    });
    return NextResponse.json({ evaluation: { id: evaluation.id, cohortId: evaluation.cohort_id, cohortName: evaluation.cohorts?.name, title: evaluation.title, description: evaluation.description, periodStart: evaluation.period_start, periodEnd: evaluation.period_end, status: evaluation.status, createdAt: evaluation.created_at }, assignments: mapped });
  } catch (error) { return handleRouteError(error); }
}

export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { evaluationId } = await params; const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); assertAdmin(user.role);
    const client = createServerSupabaseClient(accessToken); const { error } = await client.rpc("archive_evaluation", { p_evaluation_id: evaluationId });
    if (error) throw new UseCaseError(error.message, 500); return new NextResponse(null, { status: 204 });
  } catch (error) { return handleRouteError(error); }
}
