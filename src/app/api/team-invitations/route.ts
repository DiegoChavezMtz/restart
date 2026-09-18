import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainInvitation } from "@/infrastructure/supabase/mappers/toDomainInvitation";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "super_admin") throw new ForbiddenError();
    const { role } = await readJsonObject(request);
    if (role !== "admin" && role !== "psicologa") throw new UseCaseError("Rol de equipo inválido.", 400);

    const { data, error } = await createServerSupabaseClient(accessToken)
      .from("invitations")
      .insert({ cohort_id: null, created_by: user.id, intended_role: role })
      .select("*")
      .single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo crear la invitación.", 403);
    return NextResponse.json(toDomainInvitation(data), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
