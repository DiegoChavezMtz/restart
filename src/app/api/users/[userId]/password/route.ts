import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, InvalidAuthInputError, UseCaseError } from "@/application/errors";
import { validatePassword } from "@/domain/value-objects/authValidation";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createAdminSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ userId: string }> };

/** Cambia una contraseña sin exponerla ni persistirla fuera de Supabase Auth. */
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user: actor } = await requireUser(request, new SupabaseAuthRepository());
    if (actor.role !== "super_admin") throw new ForbiddenError();

    const { newPassword } = await readJsonObject(request);
    const validation = validatePassword(newPassword);
    if (validation.error) throw new InvalidAuthInputError(validation.error);

    const { userId } = await params;
    const client = createAdminSupabaseClient();
    const { error } = await client.auth.admin.updateUserById(userId, {
      password: validation.value!,
    });
    if (error) throw new UseCaseError("No fue posible actualizar la contraseña de esta cuenta.", 400);

    // La auditoría registra la acción, nunca la contraseña.
    const { error: auditError } = await client.from("appointment_audit_events").insert({
      actor_id: actor.id,
      action: "reset_password",
      entity_type: "users",
      entity_id: userId,
    });
    if (auditError) console.error("No se pudo auditar el restablecimiento de contraseña.", auditError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
