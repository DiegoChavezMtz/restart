import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { completeUserProfile, getProfileCompletionStatus } from "@/application/use-cases/employability/ProfileCompletionActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseUserProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseUserProfileRepository";

const auth = new SupabaseAuthRepository();
const userProfile = new SupabaseUserProfileRepository();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, auth);
    const status = await getProfileCompletionStatus(userProfile, { requestedBy: user, accessToken });
    return NextResponse.json(status);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, auth);
    const body = await readJsonObject(request);
    const status = await completeUserProfile(userProfile, {
      fullName: body.fullName,
      phone: body.phone,
      location: body.location,
      linkedinUrl: body.linkedinUrl,
      requestedBy: user,
      accessToken,
    });
    return NextResponse.json(status);
  } catch (error) {
    return handleRouteError(error);
  }
}
