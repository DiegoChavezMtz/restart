import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { createCvBulletDraft } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCvRepository, SupabaseEvidenceRepository, SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); const body = await readJsonObject(request); return NextResponse.json(await createCvBulletDraft({ cv: new SupabaseCvRepository(), targets: new SupabaseJobTargetRepository(), evidence: new SupabaseEvidenceRepository() }, { requestedBy: user, accessToken, cvId: (await params).id, experienceEntryId: body.experienceEntryId as string, claim: body.claim, metricValue: body.metricValue, metricConfirmedByUser: body.metricConfirmedByUser })); } catch (error) { return handleRouteError(error); } }
