import { NextResponse, type NextRequest } from "next/server";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseAppointmentRepository } from "@/infrastructure/supabase/repositories/SupabaseAppointmentRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const { id } = await params;
    const body = await readJsonObject(request);
    const status = body.status;
    if (body.notes !== undefined || body.locationText !== undefined || body.tags !== undefined) {
      return NextResponse.json({ error: "La edición de notas, ubicación y etiquetas se migrará con el seguimiento seguro." }, { status: 501 });
    }
    if (status !== "completed" && status !== "no_show" && status !== "cancelled_by_admin" && status !== "cancelled_by_participant") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    const repo = new SupabaseAppointmentRepository();
    if (status === "cancelled_by_participant") return NextResponse.json(await repo.cancel(id, accessToken));
    if (!["super_admin", "admin", "psicologa"].includes(user.role)) throw new ForbiddenError();
    if (status === "cancelled_by_admin") return NextResponse.json(await repo.cancel(id, accessToken));
    return NextResponse.json(await repo.close(id, status, accessToken));
  } catch (error) {
    return handleRouteError(error);
  }
}
