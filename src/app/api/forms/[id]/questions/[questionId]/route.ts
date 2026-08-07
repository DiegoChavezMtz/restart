import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { optionalBoolean, optionalTimeLimit, parseQuestionConfig, parseQuestionType, requiredString } from "@/app/api/_lib/formRequestValidation";
import { InvalidQuestionConfigError } from "@/application/errors";
import { requireUser } from "@/app/api/_lib/requireUser";
import { deleteQuestion } from "@/application/use-cases/forms/DeleteQuestion";
import { updateQuestion } from "@/application/use-cases/forms/UpdateQuestion";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, questionId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const body = await readJsonObject(request);
    const label = body.label === undefined ? undefined : requiredString(body, "label");
    const type = body.type === undefined ? undefined : parseQuestionType(body.type);
    const config = body.config === undefined ? undefined : parseQuestionConfig(body.config);
    if (type && config && type !== config.type) throw new InvalidQuestionConfigError("type y config.type deben coincidir.");
    const required = optionalBoolean(body, "required");
    const timeLimitSeconds = optionalTimeLimit(body);

    const formRepo = new SupabaseFormRepository();
    const question = await updateQuestion(formRepo, {
      formId: id,
      questionId,
      label,
      type,
      config,
      required,
      timeLimitSeconds,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(question);
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
    await deleteQuestion(formRepo, {
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
