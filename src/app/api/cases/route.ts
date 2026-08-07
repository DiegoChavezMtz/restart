import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const { data, error } = await createServerSupabaseClient(accessToken).from("participant_cases")
      .select("id,participant_id,title,status,is_sensitive,created_at,updated_at").eq("is_sensitive", false).order("updated_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return NextResponse.json(data ?? []);
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new UseCaseError("Cuerpo inválido", 400);
    const { participantId, title, isSensitive, psychologistId } = body as Record<string, unknown>;
    if (typeof participantId !== "string" || typeof title !== "string" || !title.trim() || typeof isSensitive !== "boolean") throw new UseCaseError("Datos de expediente inválidos", 400);
    if (psychologistId !== undefined && typeof psychologistId !== "string") throw new UseCaseError("Psicóloga inválida", 400);
    const client = createServerSupabaseClient(accessToken); const id = randomUUID();
    const { error } = await client.from("participant_cases").insert({ id, participant_id: participantId, owner_id: user.id, title: title.trim(), is_sensitive: isSensitive, created_by: user.id });
    if (error) throw new UseCaseError(error.message, 403);
    if (typeof psychologistId === "string") {
      const { error: assignmentError } = await client.rpc("assign_psicologa_to_case", { p_case_id: id, p_psicologa_id: psychologistId });
      if (assignmentError) throw new UseCaseError(assignmentError.message, 403);
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return handleRouteError(error); }
}
