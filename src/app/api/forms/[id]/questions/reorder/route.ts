import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { assertUuid } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { reorderQuestions } from "@/application/use-cases/forms/ReorderQuestions";
import { InvalidQuestionConfigError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { orderedQuestionIds } = await readJsonObject(request);
    if (!Array.isArray(orderedQuestionIds)) throw new InvalidQuestionConfigError("orderedQuestionIds debe ser una lista.");
    const validOrderedQuestionIds = orderedQuestionIds.map((id) => assertUuid(id, "orderedQuestionIds"));

    const formRepo = new SupabaseFormRepository();
    const questions = await reorderQuestions(formRepo, {
      formId: id,
      orderedQuestionIds: validOrderedQuestionIds,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(questions);
  } catch (error) {
    return handleRouteError(error);
  }
}
