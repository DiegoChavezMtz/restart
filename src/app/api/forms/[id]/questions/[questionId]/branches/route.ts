import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { parseBranches } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { setQuestionOptionBranches } from "@/application/use-cases/forms/SetQuestionOptionBranches";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, questionId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const branches = parseBranches((await readJsonObject(request)).branches);

    const formRepo = new SupabaseFormRepository();
    const saved = await setQuestionOptionBranches(formRepo, {
      formId: id,
      questionId,
      branches,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(saved);
  } catch (error) {
    return handleRouteError(error);
  }
}
