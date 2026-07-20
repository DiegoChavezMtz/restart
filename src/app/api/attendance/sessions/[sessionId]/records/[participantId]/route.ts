import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { clearAttendanceStatus } from "@/application/use-cases/attendance/ClearAttendanceStatus";
import { setAttendanceStatus } from "@/application/use-cases/attendance/SetAttendanceStatus";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseAttendanceRepository } from "@/infrastructure/supabase/repositories/SupabaseAttendanceRepository";

type RouteParams = { params: Promise<{ sessionId: string; participantId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { sessionId, participantId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { status } = await readJsonObject(request);

    const attendanceRepo = new SupabaseAttendanceRepository();
    const record = await setAttendanceStatus(attendanceRepo, {
      sessionId,
      participantId,
      status,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(record);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { sessionId, participantId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const attendanceRepo = new SupabaseAttendanceRepository();
    await clearAttendanceStatus(attendanceRepo, {
      sessionId,
      participantId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
