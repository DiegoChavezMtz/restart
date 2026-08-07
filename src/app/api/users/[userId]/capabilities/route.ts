import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ userId: string }> };
const capabilities = [
  "manage_appointment_availability",
  "manage_non_sensitive_appointments",
  "manage_non_sensitive_internal_forms",
] as const;

function assertSuperAdmin(role: string): void {
  if (role !== "super_admin") throw new ForbiddenError();
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    assertSuperAdmin(user.role);
    const { userId } = await params;
    const { data, error } = await createServerSupabaseClient(accessToken)
      .from("user_capabilities")
      .select("capability,granted_at,granted_by,revoked_at,revoked_by")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return NextResponse.json(data ?? []);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    assertSuperAdmin(user.role);
    const { userId } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new UseCaseError("Cuerpo inválido", 400);
    const { capability, enabled } = body as { capability?: unknown; enabled?: unknown };
    if (typeof capability !== "string" || !capabilities.includes(capability as (typeof capabilities)[number]) || typeof enabled !== "boolean") {
      throw new UseCaseError("Capacidad inválida", 400);
    }
    const client = createServerSupabaseClient(accessToken);
    if (enabled) {
      const { error } = await client.from("user_capabilities").upsert(
        { user_id: userId, capability, granted_by: user.id, revoked_at: null, revoked_by: null },
        { onConflict: "user_id,capability" }
      );
      if (error) throw new UseCaseError(error.message, 403);
    } else {
      const { error } = await client.from("user_capabilities")
        .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq("user_id", userId)
        .eq("capability", capability)
        .is("revoked_at", null);
      if (error) throw new UseCaseError(error.message, 403);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
