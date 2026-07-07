import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getVisibleFormsForParticipant } from "@/application/use-cases/responses/GetVisibleFormsForParticipant";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseResponseRepository } from "@/infrastructure/supabase/repositories/SupabaseResponseRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const responseRepo = new SupabaseResponseRepository();
    const visibleForms = await getVisibleFormsForParticipant(responseRepo, {
      requestedBy: user,
      accessToken,
    });

    return NextResponse.json(visibleForms);
  } catch (error) {
    return handleRouteError(error);
  }
}
