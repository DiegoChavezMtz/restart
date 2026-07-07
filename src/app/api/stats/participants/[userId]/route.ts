import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getParticipantHistory } from "@/application/use-cases/stats/GetParticipantHistory";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";
import { SupabaseResponseRepository } from "@/infrastructure/supabase/repositories/SupabaseResponseRepository";
import { SupabaseStatsRepository } from "@/infrastructure/supabase/repositories/SupabaseStatsRepository";

type RouteParams = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const statsRepo = new SupabaseStatsRepository();
    const formRepo = new SupabaseFormRepository();
    const responseRepo = new SupabaseResponseRepository();
    const result = await getParticipantHistory(statsRepo, formRepo, responseRepo, {
      participantId: userId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
