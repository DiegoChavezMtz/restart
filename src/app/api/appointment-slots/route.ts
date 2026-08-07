import { NextResponse, type NextRequest } from "next/server";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { SupabaseAppointmentRepository } from "@/infrastructure/supabase/repositories/SupabaseAppointmentRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (!["super_admin", "admin", "psicologa"].includes(user.role)) throw new ForbiddenError();
    const body = await readJsonObject(request);
    const duration = body.durationMinutes;
    const modality = body.modality;
    if (typeof body.startsAt !== "string" || ![30, 60, 90, 120].includes(Number(duration)) || (modality !== "remote" && modality !== "in_person") || typeof body.appointmentType !== "string") {
      return NextResponse.json({ error: "Datos de disponibilidad inválidos" }, { status: 400 });
    }
    const cohortIds = Array.isArray(body.cohortIds) ? body.cohortIds.filter((item): item is string => typeof item === "string") : [];
    if (cohortIds.length === 0) throw new UseCaseError("Selecciona al menos una cohorte", 400);
    const client = createServerSupabaseClient(accessToken);
    const { data: type, error: typeError } = await client.from("appointment_types").select("id").eq("normalized_name", body.appointmentType).eq("is_active", true).maybeSingle();
    if (typeError || !type) throw new UseCaseError("Tipo de cita no disponible", 400);
    const startsAt = new Date(body.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new UseCaseError("Fecha de disponibilidad inválida", 400);
    const endsAt = new Date(startsAt.getTime() + Number(duration) * 60_000);
    const { data: slot, error } = await client.from("appointment_slots").insert({
      mentor_id: user.id, appointment_type_id: type.id, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
      duration_minutes: Number(duration), modality, location_text: modality === "in_person" ? body.locationText : null, source: "manual",
    }).select("id").single();
    if (error || !slot) throw new UseCaseError(error?.message ?? "No se pudo publicar el espacio", 409);
    const { error: cohortError } = await client.from("appointment_slot_cohorts").insert(cohortIds.map((cohortId) => ({ slot_id: slot.id, cohort_id: cohortId })));
    if (cohortError) throw new UseCaseError(cohortError.message, 409);
    const created = (await new SupabaseAppointmentRepository().listSlots(accessToken)).find((item) => item.id === slot.id);
    if (!created) throw new UseCaseError("No se pudo recuperar el espacio creado", 500);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
