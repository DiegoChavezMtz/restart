import { NextResponse, type NextRequest } from "next/server";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ id: string }> };

async function readFollowUp(id: string, accessToken: string) {
  const client = createServerSupabaseClient(accessToken);
  const [notes, goals, commitments, forms] = await Promise.all([
    client.from("appointment_notes").select("content,created_at").eq("appointment_id", id).order("created_at", { ascending: false }).limit(1),
    client.from("appointment_goals").select("description,sort_order").eq("appointment_id", id).order("sort_order"),
    client.from("appointment_commitments").select("description,status,sort_order").eq("appointment_id", id).order("sort_order"),
    client.from("appointment_form_instances").select("id,title,status").eq("appointment_id", id).order("created_at"),
  ]);
  for (const result of [notes, goals, commitments, forms]) if (result.error) throw new UseCaseError(result.error.message, 403);
  return { appointmentId: id, notes: notes.data?.[0]?.content ?? "", goals: (goals.data ?? []).map((item) => item.description), commitments: (commitments.data ?? []).map((item) => ({ description: item.description, completed: item.status === "completed" })), forms: (forms.data ?? []).map((item) => ({ templateId: item.id, title: item.title, status: item.status === "completed" ? "completed" : "in_progress" })) };
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (!["super_admin", "admin", "psicologa"].includes(user.role)) throw new ForbiddenError();
    const { id } = await params;
    return NextResponse.json(await readFollowUp(id, accessToken));
  } catch (error) { return handleRouteError(error); }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (!["super_admin", "admin", "psicologa"].includes(user.role)) throw new ForbiddenError();
    const { id } = await params;
    const body = await readJsonObject(request);
    if (typeof body.notes !== "string" || !Array.isArray(body.goals) || !Array.isArray(body.commitments) || !Array.isArray(body.forms)) throw new UseCaseError("Seguimiento inválido", 400);
    const client = createServerSupabaseClient(accessToken);
    const current = await readFollowUp(id, accessToken);
    const { error: noteError } = await client.rpc("save_appointment_note", { p_appointment_id: id, p_note_id: null, p_content: body.notes });
    if (noteError) throw new UseCaseError(noteError.message, 403);
    for (const [index, description] of body.goals.filter((item): item is string => typeof item === "string" && item.trim().length > 0).entries()) {
      if (!current.goals.includes(description)) { const { error } = await client.rpc("save_appointment_goal", { p_appointment_id: id, p_goal_id: null, p_description: description, p_sort_order: index }); if (error) throw new UseCaseError(error.message, 403); }
    }
    for (const [index, item] of body.commitments.filter((value): value is { description: string; completed: boolean } => Boolean(value && typeof value === "object" && typeof (value as { description?: unknown }).description === "string")).entries()) {
      if (!current.commitments.some((existing) => existing.description === item.description)) { const { error } = await client.rpc("save_appointment_commitment", { p_appointment_id: id, p_commitment_id: null, p_description: item.description, p_status: item.completed ? "completed" : "pending", p_sort_order: index }); if (error) throw new UseCaseError(error.message, 403); }
    }
    for (const form of body.forms.filter((value): value is { templateId: string } => Boolean(value && typeof value === "object" && typeof (value as { templateId?: unknown }).templateId === "string"))) {
      if (!current.forms.some((existing) => existing.templateId === form.templateId)) { const { error } = await client.rpc("create_appointment_form_instance", { p_appointment_id: id, p_source_form_id: form.templateId, p_title: null }); if (error) throw new UseCaseError(error.message, 403); }
    }
    return NextResponse.json(await readFollowUp(id, accessToken));
  } catch (error) { return handleRouteError(error); }
}
