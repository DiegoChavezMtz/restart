import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requiredBoolean } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { toggleAcceptingResponses } from "@/application/use-cases/forms/ToggleAcceptingResponses";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const acceptingResponses = requiredBoolean(await readJsonObject(request), "acceptingResponses");

    const formRepo = new SupabaseFormRepository();
    const form = await toggleAcceptingResponses(formRepo, {
      formId: id,
      acceptingResponses,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(form);
  } catch (error) {
    return handleRouteError(error);
  }
}
