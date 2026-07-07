import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { resumeFormResponse } from "@/application/use-cases/responses/ResumeFormResponse";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";
import { SupabaseResponseRepository } from "@/infrastructure/supabase/repositories/SupabaseResponseRepository";

type RouteParams = { params: Promise<{ formId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { formId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const responseRepo = new SupabaseResponseRepository();
    const formRepo = new SupabaseFormRepository();
    const result = await resumeFormResponse(responseRepo, formRepo, {
      formId,
      requestedBy: user,
      accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
