import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { getEmploymentProfile, updateEmploymentProfile } from "@/application/use-cases/employability/EmploymentProfileActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
const auth = new SupabaseAuthRepository(); const repo = new SupabaseEmploymentProfileRepository();
export async function GET(request: NextRequest): Promise<NextResponse> { try { const { user, accessToken } = await requireUser(request, auth); return NextResponse.json(await getEmploymentProfile(repo, { requestedBy: user, accessToken })); } catch (error) { return handleRouteError(error); } }
export async function PUT(request: NextRequest): Promise<NextResponse> { try { const { user, accessToken } = await requireUser(request, auth); const body = await readJsonObject(request); return NextResponse.json(await updateEmploymentProfile(repo, { ...body, requestedBy: user, accessToken })); } catch (error) { return handleRouteError(error); } }
