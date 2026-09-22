import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

function getPeriodStart(): string {
  const today = new Date();
  const year = today.getUTCMonth() < 6 ? today.getUTCFullYear() - 1 : today.getUTCFullYear();
  return `${year}-07-01`;
}

type RecordRow = {
  id: string;
  session_id: string;
  status: "asistio" | "retardo" | "falta" | "justificado";
  recorded_at: string;
  attendance_justifications: { description: string } | { description: string }[] | null;
};

function justificationDescription(value: RecordRow["attendance_justifications"]): string | null {
  const item = Array.isArray(value) ? value[0] : value;
  return item?.description ?? null;
}

/** Personal attendance since the agreed programme start date. RLS also limits every query to the actor. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "usuario" && user.role !== "test") throw new ForbiddenError();
    const periodStart = getPeriodStart();

    if (!user.cohortId) {
      return NextResponse.json({ available: false, periodStart, sessions: [], summary: null });
    }

    const client = createServerSupabaseClient(accessToken);
    const [{ data: sessions, error: sessionsError }, { data: records, error: recordsError }] = await Promise.all([
      client.from("attendance_sessions").select("id,session_date").gte("session_date", periodStart).order("session_date", { ascending: false }),
      client.from("attendance_records").select("id,session_id,status,recorded_at,attendance_justifications(description)").eq("participant_id", user.id),
    ]);
    if (sessionsError || recordsError) throw new UseCaseError(sessionsError?.message ?? recordsError?.message ?? "No fue posible consultar la asistencia.", 500);

    const recordsBySession = new Map((records ?? []).map((record) => [record.session_id, record as RecordRow]));
    const visibleSessions = (sessions ?? []).map((session) => {
      const record = recordsBySession.get(session.id);
      return {
        id: session.id,
        date: session.session_date,
        status: record?.status ?? "sin_registro",
        justificationDescription: record ? justificationDescription(record.attendance_justifications) : null,
      };
    });

    const totals = visibleSessions.reduce(
      (summary, session) => {
        if (session.status === "asistio") summary.present += 1;
        if (session.status === "retardo") summary.late += 1;
        if (session.status === "falta") summary.absent += 1;
        if (session.status === "justificado") summary.justified += 1;
        if (session.status === "sin_registro") summary.unrecorded += 1;
        return summary;
      },
      { present: 0, late: 0, absent: 0, justified: 0, unrecorded: 0 }
    );

    return NextResponse.json({
      available: true,
      periodStart,
      sessions: visibleSessions,
      summary: { ...totals, totalSessions: visibleSessions.length, derivedAbsences: Math.floor(totals.late / 3) },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
