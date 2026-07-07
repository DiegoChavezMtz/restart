import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { addQuestion } from "@/application/use-cases/forms/AddQuestion";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { label, type, config, required, timeLimitSeconds } = await request.json();

    const formRepo = new SupabaseFormRepository();
    const question = await addQuestion(formRepo, {
      formId: id,
      label,
      type,
      config,
      required,
      timeLimitSeconds: timeLimitSeconds ?? null,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(question);
  } catch (error) {
    return handleRouteError(error);
  }
}
