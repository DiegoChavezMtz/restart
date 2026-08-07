import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { UseCaseError } from "@/application/errors";
import { generateInvitationLink } from "@/application/use-cases/auth/GenerateInvitationLink";
import { listInvitationsByCohort } from "@/application/use-cases/auth/ListInvitationsByCohort";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const repo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, repo);
    const cohortId = request.nextUrl.searchParams.get("cohortId");
    if (!cohortId) throw new UseCaseError("Missing cohortId query param", 400);

    const invitations = await listInvitationsByCohort(repo, {
      cohortId,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(invitations);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const repo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, repo);
    const { cohortId, intendedRole } = await request.json();
    if (intendedRole !== undefined && intendedRole !== "usuario" && intendedRole !== "test") {
      throw new UseCaseError("Rol de invitación inválido", 400);
    }

    const invitation = await generateInvitationLink(repo, {
      cohortId,
      requestedBy: user,
      adminAccessToken: accessToken,
      intendedRole,
    });

    return NextResponse.json(invitation);
  } catch (error) {
    return handleRouteError(error);
  }
}
