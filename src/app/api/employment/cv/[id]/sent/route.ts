import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { markCvAsSent } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCvRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); return NextResponse.json(await markCvAsSent({ cv: new SupabaseCvRepository() }, { requestedBy: user, accessToken, cvId: (await params).id })); } catch (error) { return handleRouteError(error); } }
