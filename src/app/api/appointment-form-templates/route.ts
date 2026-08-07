import { NextResponse, type NextRequest } from "next/server";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (!["super_admin", "admin", "psicologa"].includes(user.role)) throw new ForbiddenError();
    const { data, error } = await createServerSupabaseClient(accessToken)
      .from("forms").select("id,title,description,created_by,updated_at,questions(count)").eq("purpose", "appointment_internal").order("updated_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return NextResponse.json((data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description, questionCount: Array.isArray(row.questions) ? row.questions.length : 0, createdBy: row.created_by, updatedAt: row.updated_at })));
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin" && user.role !== "psicologa") throw new ForbiddenError();
    const body = await readJsonObject(request);
    if (typeof body.title !== "string" || !body.title.trim()) throw new UseCaseError("El título es requerido", 400);
    const isPsychological = user.role === "psicologa" ? true : body.isPsychological === true;
    const { data, error } = await createServerSupabaseClient(accessToken).from("forms").insert({ title: body.title.trim(), description: typeof body.description === "string" ? body.description : null, purpose: "appointment_internal", is_psychological: isPsychological, created_by: user.id }).select("id,title,description,created_by,updated_at").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo crear la plantilla", 409);
    return NextResponse.json({ id: data.id, title: data.title, description: data.description, questionCount: 0, createdBy: data.created_by, updatedAt: data.updated_at }, { status: 201 });
  } catch (error) { return handleRouteError(error); }
}
