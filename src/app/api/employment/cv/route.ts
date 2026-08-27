import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { generateCvDraft } from "@/application/use-cases/employability/EmploymentAiActions";
import { assertEmploymentUser } from "@/application/use-cases/employability/profileHelpers";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
import { SupabaseCvRepository, SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
import { SupabaseUserProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseUserProfileRepository";
const auth = new SupabaseAuthRepository(), cv = new SupabaseCvRepository();
export async function GET(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, auth); assertEmploymentUser(user); return NextResponse.json(await cv.list(accessToken)); } catch (error) { return handleRouteError(error); } }
export async function POST(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, auth); const body = await readJsonObject(request); return NextResponse.json(await generateCvDraft({ cv, targets: new SupabaseJobTargetRepository(), profile: new SupabaseEmploymentProfileRepository(), userProfile: new SupabaseUserProfileRepository() }, { jobTargetId: body.jobTargetId as string, experienceEntryIds: body.experienceEntryIds, requestedBy: user, accessToken }), { status: 201 }); } catch (error) { return handleRouteError(error); } }
