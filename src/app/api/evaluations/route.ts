import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

const isAdmin = (role: string) => role === "admin" || role === "super_admin";
type ResultRow = { id: string; version?: number; status: "draft" | "published"; score?: number | null; file_name?: string | null; published_at?: string | null };
type AssignmentRow = { id: string; evaluation_id?: string; assigned_at?: string; evaluation_results?: ResultRow[]; evaluations?: EvaluationRow };
type EvaluationRow = { id: string; cohort_id: string; title: string; description: string | null; period_start: string; period_end: string; status: "active" | "archived"; created_at: string; cohorts?: { name: string } | null; evaluation_assignments?: AssignmentRow[] };

function mapEvaluation(row: EvaluationRow) {
  const assignments = row.evaluation_assignments ?? [];
  return {
    id: row.id, cohortId: row.cohort_id, cohortName: row.cohorts?.name,
    title: row.title, description: row.description, periodStart: row.period_start, periodEnd: row.period_end,
    status: row.status, createdAt: row.created_at,
    assignedCount: assignments.length,
    publishedCount: assignments.filter((assignment) => (assignment.evaluation_results ?? []).some((result) => result.status === "published")).length,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const client = createServerSupabaseClient(accessToken);
    if (isAdmin(user.role)) {
      const { data, error } = await client.from("evaluations").select("*, cohorts(name), evaluation_assignments(id, evaluation_results(id, status))").order("period_start", { ascending: false });
      if (error) throw new UseCaseError(error.message, 500);
      return NextResponse.json(((data ?? []) as unknown as EvaluationRow[]).map(mapEvaluation));
    }
    const { data, error } = await client.from("evaluation_assignments").select("id, evaluation_id, assigned_at, evaluations(*), evaluation_results(id, version, status, score, file_name, published_at)").eq("participant_id", user.id);
    if (error) throw new UseCaseError(error.message, 500);
    const items = ((data ?? []) as unknown as AssignmentRow[]).map((assignment) => {
      const published = (assignment.evaluation_results ?? []).filter((result) => result.status === "published").sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))[0] ?? null;
      if (!assignment.evaluations) throw new UseCaseError("No se encontró la evaluación asignada.", 500);
      return { assignmentId: assignment.id, evaluation: mapEvaluation({ ...assignment.evaluations, evaluation_assignments: [] }), result: published };
    }).sort((a, b) => a.evaluation.periodStart.localeCompare(b.evaluation.periodStart));
    return NextResponse.json(items);
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (!isAdmin(user.role)) throw new ForbiddenError();
    const body = await readJsonObject(request);
    const cohortId = typeof body.cohortId === "string" ? body.cohortId : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description : "";
    const periodStart = typeof body.periodStart === "string" ? body.periodStart : "";
    const periodEnd = typeof body.periodEnd === "string" ? body.periodEnd : "";
    if (!cohortId || !title || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) throw new UseCaseError("Completa título, cohorte y periodo de evaluación.", 400);
    if (periodEnd < periodStart) throw new UseCaseError("La fecha final debe ser posterior a la inicial.", 400);
    const client = createServerSupabaseClient(accessToken);
    const { data: id, error } = await client.rpc("create_evaluation", { p_cohort_id: cohortId, p_title: title, p_description: description, p_period_start: periodStart, p_period_end: periodEnd });
    if (error || !id) throw new UseCaseError(error?.message ?? "No se pudo crear la evaluación.", 500);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return handleRouteError(error); }
}
