import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { createApplication } from "@/application/use-cases/employability/ApplicationActions";
import { assertEmploymentUser } from "@/application/use-cases/employability/profileHelpers";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseApplicationRepository, SupabaseCvRepository, SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function GET(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); assertEmploymentUser(user); return NextResponse.json(await new SupabaseApplicationRepository().list(accessToken)); } catch (error) { return handleRouteError(error); } }
export async function POST(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); const body = await readJsonObject(request); return NextResponse.json(await createApplication({ applications: new SupabaseApplicationRepository(), targets: new SupabaseJobTargetRepository(), cv: new SupabaseCvRepository() }, { ...body, requestedBy: user, accessToken }), { status: 201 }); } catch (error) { return handleRouteError(error); } }
