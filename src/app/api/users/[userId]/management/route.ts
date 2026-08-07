import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ userId: string }> };
const roles = ["super_admin", "admin", "psicologa", "usuario", "test"] as const;

/** Gestión de rol/estado. La RPC replica y audita estas restricciones en DB. */
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const { userId } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new UseCaseError("Cuerpo inválido", 400);
    const { role, isActive } = body as { role?: unknown; isActive?: unknown };
    if (role !== undefined && (typeof role !== "string" || !roles.includes(role as (typeof roles)[number]))) {
      throw new UseCaseError("Rol inválido", 400);
    }
    if (isActive !== undefined && typeof isActive !== "boolean") throw new UseCaseError("isActive debe ser booleano", 400);
    if (role === undefined && isActive === undefined) throw new UseCaseError("Indica al menos un cambio", 400);
    const client = createServerSupabaseClient(accessToken);
    const { error } = await client.rpc("update_managed_user", {
      p_user_id: userId,
      p_role: role ?? null,
      p_is_active: isActive ?? null,
    });
    if (error) throw new UseCaseError(error.message, 403);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
