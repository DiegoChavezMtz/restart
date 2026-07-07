import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { submitAnswerAndAdvance } from "@/application/use-cases/responses/SubmitAnswerAndAdvance";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";
import { SupabaseResponseRepository } from "@/infrastructure/supabase/repositories/SupabaseResponseRepository";

type RouteParams = { params: Promise<{ responseId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { responseId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { questionId, value, autoSubmittedByTimeout } = await request.json();

    const responseRepo = new SupabaseResponseRepository();
    const formRepo = new SupabaseFormRepository();
    const result = await submitAnswerAndAdvance(responseRepo, formRepo, {
      responseId,
      questionId,
      value,
      autoSubmittedByTimeout: autoSubmittedByTimeout ?? false,
      requestedBy: user,
      accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
