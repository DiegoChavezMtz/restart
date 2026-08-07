import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { assertUuid } from "@/app/api/_lib/formRequestValidation";
import { InvalidQuestionConfigError } from "@/application/errors";
import { requireUser } from "@/app/api/_lib/requireUser";
import { clearQuestionSkillWeight } from "@/application/use-cases/forms/ClearQuestionSkillWeight";
import { setQuestionSkillWeight } from "@/application/use-cases/forms/SetQuestionSkillWeight";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, questionId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const body = await readJsonObject(request);
    const skillId = assertUuid(body.skillId, "skillId");
    const weight = body.weight;
    if (!Number.isInteger(weight)) throw new InvalidQuestionConfigError("weight debe ser un entero.");

    const formRepo = new SupabaseFormRepository();
    const questionSkillWeight = await setQuestionSkillWeight(formRepo, {
      formId: id,
      questionId,
      skillId,
      weight: weight as number,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(questionSkillWeight);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, questionId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const formRepo = new SupabaseFormRepository();
    await clearQuestionSkillWeight(formRepo, {
      formId: id,
      questionId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
