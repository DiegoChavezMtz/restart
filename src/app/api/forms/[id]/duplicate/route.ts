import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { duplicateForm } from "@/application/use-cases/forms/DuplicateForm";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const formRepo = new SupabaseFormRepository();
    const newForm = await duplicateForm(formRepo, {
      formId: id,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(newForm);
  } catch (error) {
    return handleRouteError(error);
  }
}
