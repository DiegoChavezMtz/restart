import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainUser } from "@/infrastructure/supabase/mappers/toDomainUser";

/** Lista operativa de cuentas; sólo personal administrativo. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    if (user.role !== "admin" && user.role !== "super_admin") throw new ForbiddenError();
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client
      .from("users")
      .select("id,email,full_name,role,cohort_id,is_active,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return NextResponse.json((data ?? []).map(toDomainUser));
  } catch (error) {
    return handleRouteError(error);
  }
}
