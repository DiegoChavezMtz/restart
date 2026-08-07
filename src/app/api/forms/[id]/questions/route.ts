import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { optionalTimeLimit, parseQuestionConfig, parseQuestionType, requiredBoolean, requiredString } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { addQuestion } from "@/application/use-cases/forms/AddQuestion";
import { InvalidQuestionConfigError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const body = await readJsonObject(request);
    const label = requiredString(body, "label");
    const type = parseQuestionType(body.type);
    const config = parseQuestionConfig(body.config);
    if (type !== config.type) throw new InvalidQuestionConfigError("type y config.type deben coincidir.");
    const required = requiredBoolean(body, "required");
    const timeLimitSeconds = optionalTimeLimit(body) ?? null;

    const formRepo = new SupabaseFormRepository();
    const question = await addQuestion(formRepo, {
      formId: id,
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
