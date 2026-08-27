import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getIkigaiProfile } from "@/application/use-cases/employability/GetIkigaiProfile";
import { updateIkigaiProfile } from "@/application/use-cases/employability/UpdateIkigaiProfile";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseIkigaiRepository } from "@/infrastructure/supabase/repositories/SupabaseIkigaiRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const profile = await getIkigaiProfile(new SupabaseIkigaiRepository(), { requestedBy: user, accessToken });
    return NextResponse.json(profile);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const body = await readJsonObject(request);
    const profile = await updateIkigaiProfile(new SupabaseIkigaiRepository(), {
      ...body,
      requestedBy: user,
      accessToken,
    });
    return NextResponse.json(profile);
  } catch (error) {
    return handleRouteError(error);
  }
}
