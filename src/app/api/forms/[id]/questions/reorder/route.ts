import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { reorderQuestions } from "@/application/use-cases/forms/ReorderQuestions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { orderedQuestionIds } = await request.json();

    const formRepo = new SupabaseFormRepository();
    const questions = await reorderQuestions(formRepo, {
      formId: id,
      orderedQuestionIds,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(questions);
  } catch (error) {
    return handleRouteError(error);
  }
}
