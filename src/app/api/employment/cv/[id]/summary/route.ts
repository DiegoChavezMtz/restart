import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { applyCvSummaryAlternative, getCvSummaryAlternatives } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
import { SupabaseCvRepository, SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); return NextResponse.json(await getCvSummaryAlternatives({ cv: new SupabaseCvRepository(), targets: new SupabaseJobTargetRepository(), profile: new SupabaseEmploymentProfileRepository() }, { requestedBy: user, accessToken, cvId: (await params).id })); } catch (error) { return handleRouteError(error); } }
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); const body = await readJsonObject(request); return NextResponse.json(await applyCvSummaryAlternative({ cv: new SupabaseCvRepository() }, { requestedBy: user, accessToken, cvId: (await params).id, headline: body.headline, summary: body.summary })); } catch (error) { return handleRouteError(error); } }
