import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, InvitationNotFoundError } from "@/application/errors";
import { validateInvitationToken } from "@/application/use-cases/auth/ValidateInvitationToken";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { token } = await params;
    const repo = new SupabaseAuthRepository();
    const { cohortId } = await validateInvitationToken(repo, token);
    return NextResponse.json({ cohortId });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { token } = await params;
    const repo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, repo);
    // Defense in depth on top of RLS (invitations_admin_all), same pattern as GenerateInvitationLink.
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();

    const invitation = await repo.getInvitationByToken(token);
    if (!invitation) throw new InvitationNotFoundError();

    await repo.deactivateInvitation(invitation.id, accessToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
