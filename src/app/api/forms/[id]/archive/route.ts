import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requiredBoolean } from "@/app/api/_lib/formRequestValidation";
import { requireUser } from "@/app/api/_lib/requireUser";
import { archiveForm, restoreArchivedForm } from "@/application/use-cases/forms/CloseForm";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const archived = requiredBoolean(await readJsonObject(request), "archived");
    const repo = new SupabaseFormRepository();
    const input = { formId: id, requestedBy: user, adminAccessToken: accessToken };
    return NextResponse.json(archived ? await archiveForm(repo, input) : await restoreArchivedForm(repo, input));
  } catch (error) {
    return handleRouteError(error);
  }
}
