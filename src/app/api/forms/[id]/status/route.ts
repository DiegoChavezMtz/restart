import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requiredString } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { UseCaseError } from "@/application/errors";
import { closeForm } from "@/application/use-cases/forms/CloseForm";
import { publishForm } from "@/application/use-cases/forms/PublishForm";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const status = requiredString(await readJsonObject(request), "status");

    const formRepo = new SupabaseFormRepository();
    const input = { formId: id, requestedBy: user, adminAccessToken: accessToken };

    if (status === "published") {
      return NextResponse.json(await publishForm(formRepo, input));
    }
    if (status === "closed") {
      return NextResponse.json(await closeForm(formRepo, input));
    }
    throw new UseCaseError('status must be "published" or "closed"', 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
