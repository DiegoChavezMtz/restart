import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { buildOpenBadgeCredential } from "@/application/use-cases/badges/buildOpenBadgeCredential";
import { getPublicBadgeAssertion } from "@/application/use-cases/badges/GetPublicBadgeAssertion";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

type RouteParams = { params: Promise<{ id: string }> };

// Público: el JSON Open Badges 3.0 / Verifiable Credential que LinkedIn y
// terceros consumen directo para validar la credencial.
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const badgeRepo = new SupabaseBadgeRepository();
    const assertion = await getPublicBadgeAssertion(badgeRepo, { id });
    const verifyUrl = new URL(`/badges/verify/${id}`, request.nextUrl.origin).toString();
    const credential = buildOpenBadgeCredential(assertion, verifyUrl);
    return NextResponse.json(credential);
  } catch (error) {
    return handleRouteError(error);
  }
}
