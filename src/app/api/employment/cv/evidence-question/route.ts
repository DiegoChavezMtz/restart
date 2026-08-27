import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { requestEvidenceQuestion } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
export async function POST(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); const body = await readJsonObject(request); return NextResponse.json(await requestEvidenceQuestion({ requestedBy: user, accessToken, claim: body.claim })); } catch (error) { return handleRouteError(error); } }
