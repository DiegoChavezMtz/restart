import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

type RouteParams = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const { id } = await params; const client = createServerSupabaseClient(accessToken);
    const { data: appointment, error } = await client.from("appointments").select("participant_id,participant_cohort_name").eq("id", id).maybeSingle();
    if (error || !appointment) throw new UseCaseError(error?.message ?? "Cita no encontrada", 404);
    const [profile, history, records] = await Promise.all([
      client.from("users").select("id,full_name,email,created_at").eq("id", appointment.participant_id).maybeSingle(),
      client.from("appointments").select("id,starts_at,appointment_type_name,status,mentor:users!appointments_mentor_id_fkey(full_name)").eq("participant_id", appointment.participant_id).order("starts_at", { ascending: false }),
      client.from("attendance_records").select("status").eq("participant_id", appointment.participant_id),
    ]);
    if (profile.error || !profile.data || history.error || records.error) throw new UseCaseError(profile.error?.message ?? history.error?.message ?? records.error?.message ?? "No fue posible consultar el participante", 403);
    const attendanceSummary = { attended: 0, late: 0, absent: 0 };
    for (const record of records.data ?? []) { if (record.status === "asistio") attendanceSummary.attended++; else if (record.status === "retardo") attendanceSummary.late++; else if (record.status === "falta") attendanceSummary.absent++; }
    return NextResponse.json({ id: profile.data.id, fullName: profile.data.full_name, email: profile.data.email, cohortName: appointment.participant_cohort_name ?? "Sin cohorte", joinedAt: profile.data.created_at, attendanceSummary, appointmentHistory: (history.data ?? []).map((item) => ({ id: item.id, startsAt: item.starts_at, type: item.appointment_type_name, status: item.status, mentorName: Array.isArray(item.mentor) ? item.mentor[0]?.full_name ?? "Sin asignar" : "Sin asignar" })) });
  } catch (error) { return handleRouteError(error); }
}
