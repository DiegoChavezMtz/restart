import { NextResponse, type NextRequest } from "next/server";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseAppointmentRepository } from "@/infrastructure/supabase/repositories/SupabaseAppointmentRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const repo = new SupabaseAppointmentRepository();
    const view = request.nextUrl.searchParams.get("view") ?? "participant";
    if (view === "admin") {
      if (!["super_admin", "admin", "psicologa"].includes(user.role)) throw new ForbiddenError();
      const [appointments, slots] = await Promise.all([repo.listAppointments(accessToken), repo.listSlots(accessToken)]);
      return NextResponse.json({ appointments, slots, demoMode: false });
    }
    if (user.role !== "usuario" && user.role !== "test") throw new ForbiddenError();
    const [appointments, slots] = await Promise.all([repo.listAppointments(accessToken), repo.listSlots(accessToken)]);
    return NextResponse.json({ appointments, slots, demoMode: false });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "usuario" && user.role !== "test") throw new ForbiddenError();
    const body = await readJsonObject(request);
    if (typeof body.slotId !== "string") return NextResponse.json({ error: "slotId es requerido" }, { status: 400 });
    return NextResponse.json(await new SupabaseAppointmentRepository().reserve(body.slotId, accessToken), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
