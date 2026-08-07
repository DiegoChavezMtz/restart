import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ formId: string }> };
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "psicologa" && user.role !== "super_admin") throw new ForbiddenError();
    const { formId } = await params; const { label } = await request.json();
    if (typeof label !== "string" || !label.trim()) throw new UseCaseError("La pregunta es obligatoria", 400);
    const client = createServerSupabaseClient(accessToken);
    const { data: form, error: formError } = await client.from("forms").select("id,purpose,is_psychological,created_by").eq("id", formId).maybeSingle();
    if (formError || !form || form.purpose !== "appointment_internal" || !form.is_psychological || (user.role === "psicologa" && form.created_by !== user.id)) throw new ForbiddenError();
    const { data: last, error: lastError } = await client.from("questions").select("order").eq("form_id", formId).order("order", { ascending: false }).limit(1);
    if (lastError) throw new UseCaseError(lastError.message, 403);
    const { data, error } = await client.from("questions").insert({ form_id: formId, order: (last?.[0]?.order ?? -1) + 1, label: label.trim(), type: "open_text", config: { type: "open_text", maxLength: 4000 }, required: true }).select("id,label,order").single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo crear la pregunta", 403);
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return handleRouteError(error); }
}
