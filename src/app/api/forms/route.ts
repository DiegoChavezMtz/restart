import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { createForm } from "@/application/use-cases/forms/CreateForm";
import { listForms } from "@/application/use-cases/forms/ListForms";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const formRepo = new SupabaseFormRepository();
    const forms = await listForms(formRepo, { requestedBy: user, adminAccessToken: accessToken });

    return NextResponse.json(forms);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { title, description } = await request.json();

    const formRepo = new SupabaseFormRepository();
    const form = await createForm(formRepo, {
      title,
      description: description ?? null,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(form);
  } catch (error) {
    return handleRouteError(error);
  }
}
