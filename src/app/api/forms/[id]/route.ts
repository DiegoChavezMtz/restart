import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { optionalBoolean, optionalString, requiredString } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getForm } from "@/application/use-cases/forms/GetForm";
import { updateFormDetails } from "@/application/use-cases/forms/UpdateFormDetails";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const formRepo = new SupabaseFormRepository();
    const result = await getForm(formRepo, {
      formId: id,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const body = await readJsonObject(request);
    const title = body.title === undefined ? undefined : requiredString(body, "title");
    const description = optionalString(body, "description");
    const allowsPartialSave = optionalBoolean(body, "allowsPartialSave");
    const instructionsPopup = optionalString(body, "instructionsPopup");

    const formRepo = new SupabaseFormRepository();
    const form = await updateFormDetails(formRepo, {
      formId: id,
      title,
      description,
      allowsPartialSave,
      instructionsPopup,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(form);
  } catch (error) {
    return handleRouteError(error);
  }
}
