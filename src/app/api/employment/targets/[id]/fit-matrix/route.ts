import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getJobFitMatrix } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
import { SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); return NextResponse.json(await getJobFitMatrix({ targets: new SupabaseJobTargetRepository(), profile: new SupabaseEmploymentProfileRepository() }, { requestedBy: user, accessToken, jobTargetId: (await params).id })); } catch (error) { return handleRouteError(error); } }
