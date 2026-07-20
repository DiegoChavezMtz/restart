import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { UseCaseError } from "@/application/errors";
import { ensureRecentAttendanceSessions } from "@/application/use-cases/attendance/EnsureRecentAttendanceSessions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseAttendanceRepository } from "@/infrastructure/supabase/repositories/SupabaseAttendanceRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const { cohortId } = await readJsonObject(request);
    if (typeof cohortId !== "string" || !cohortId) {
      throw new UseCaseError("cohortId is required", 400);
    }

    const attendanceRepo = new SupabaseAttendanceRepository();
    const sessions = await ensureRecentAttendanceSessions(attendanceRepo, {
      cohortId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return handleRouteError(error);
  }
}
