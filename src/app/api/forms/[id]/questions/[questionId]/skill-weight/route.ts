import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
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
    const { skillId, weight } = await request.json();

    const formRepo = new SupabaseFormRepository();
    const questionSkillWeight = await setQuestionSkillWeight(formRepo, {
      formId: id,
      questionId,
      skillId,
      weight,
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
