import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getEmploymentInsights } from "@/application/use-cases/employability/EmploymentInsightsActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
import { SupabaseApplicationRepository, SupabaseCvRepository, SupabaseEvidenceRepository, SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";

export async function GET(request: NextRequest) {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    return NextResponse.json(await getEmploymentInsights({ applications: new SupabaseApplicationRepository(), cv: new SupabaseCvRepository(), profile: new SupabaseEmploymentProfileRepository(), evidence: new SupabaseEvidenceRepository(), targets: new SupabaseJobTargetRepository() }, { requestedBy: user, accessToken }));
  } catch (error) { return handleRouteError(error); }
}
