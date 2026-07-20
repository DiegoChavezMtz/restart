import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { InvalidAttendanceInputError } from "@/application/errors";
import { getAttendanceJustificationFileUrl } from "@/application/use-cases/attendance/GetAttendanceJustificationFileUrl";
import { justifyAttendance } from "@/application/use-cases/attendance/JustifyAttendance";
import { removeAttendanceJustification } from "@/application/use-cases/attendance/RemoveAttendanceJustification";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseAttendanceRepository } from "@/infrastructure/supabase/repositories/SupabaseAttendanceRepository";

type RouteParams = { params: Promise<{ sessionId: string; participantId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { sessionId, participantId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const attendanceRepo = new SupabaseAttendanceRepository();
    const result = await getAttendanceJustificationFileUrl(attendanceRepo, {
      sessionId,
      participantId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { sessionId, participantId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new InvalidAttendanceInputError("Request body must be multipart/form-data.");
    }
    const description = form.get("description");
    const file = form.get("file");
    if (typeof description !== "string") {
      throw new InvalidAttendanceInputError("description is required.");
    }

    const attendanceRepo = new SupabaseAttendanceRepository();
    const record = await justifyAttendance(attendanceRepo, {
      sessionId,
      participantId,
      description,
      file: file instanceof File && file.size > 0 ? file : null,
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
    const record = await removeAttendanceJustification(attendanceRepo, {
      sessionId,
      participantId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(record);
  } catch (error) {
    return handleRouteError(error);
  }
}
