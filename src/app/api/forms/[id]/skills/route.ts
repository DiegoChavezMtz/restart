import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { createFormSkill } from "@/application/use-cases/forms/CreateFormSkill";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseFormRepository } from "@/infrastructure/supabase/repositories/SupabaseFormRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);
    const { name, description, icon, color } = await request.json();

    const formRepo = new SupabaseFormRepository();
    const skill = await createFormSkill(formRepo, {
      formId: id,
      name,
      description: description ?? null,
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
