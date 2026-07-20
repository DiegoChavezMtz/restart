import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { UseCaseError } from "@/application/errors";
import { listAttendanceRecords } from "@/application/use-cases/attendance/ListAttendanceRecords";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseAttendanceRepository } from "@/infrastructure/supabase/repositories/SupabaseAttendanceRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const cohortId = request.nextUrl.searchParams.get("cohortId");
    if (!cohortId) throw new UseCaseError("Missing cohortId query param", 400);

    const attendanceRepo = new SupabaseAttendanceRepository();
    const records = await listAttendanceRecords(attendanceRepo, {
      cohortId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(records);
  } catch (error) {
    return handleRouteError(error);
  }
}
