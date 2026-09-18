import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { getPublicBadgeAssertion } from "@/application/use-cases/badges/GetPublicBadgeAssertion";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

type RouteParams = { params: Promise<{ id: string }> };

// Público, sin autenticación: es lo que la página /badges/verify/[id] y
// terceros (LinkedIn) consultan para validar una credencial.
export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const badgeRepo = new SupabaseBadgeRepository();
    const assertion = await getPublicBadgeAssertion(badgeRepo, { id });
    return NextResponse.json(assertion);
  } catch (error) {
    return handleRouteError(error);
  }
}
