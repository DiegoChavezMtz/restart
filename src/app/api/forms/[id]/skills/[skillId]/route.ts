import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { deleteFormSkill } from "@/application/use-cases/forms/DeleteFormSkill";
import { updateFormSkill } from "@/application/use-cases/forms/UpdateFormSkill";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string; skillId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, skillId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { name, description, icon, color } = await request.json();

    const formRepo = new SupabaseFormRepository();
    const skill = await updateFormSkill(formRepo, {
      formId: id,
      skillId,
      name,
      description,
      icon,
      color,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(skill);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id, skillId } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const formRepo = new SupabaseFormRepository();
    await deleteFormSkill(formRepo, {
      formId: id,
      skillId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
