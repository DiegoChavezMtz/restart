import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { analyzeJobTarget } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
import { SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
const auth = new SupabaseAuthRepository(), targets = new SupabaseJobTargetRepository(), profile = new SupabaseEmploymentProfileRepository();
export async function GET(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, auth); if (user.role !== "usuario" && user.role !== "test") return NextResponse.json({ error: "Forbidden" }, { status: 403 }); return NextResponse.json(await targets.listJobTargets(accessToken)); } catch (error) { return handleRouteError(error); } }
export async function POST(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, auth); const body = await readJsonObject(request); return NextResponse.json(await analyzeJobTarget({ targets, profile }, { sourceSite: body.sourceSite as string, rawText: body.rawText, requestedBy: user, accessToken }), { status: 201 }); } catch (error) { return handleRouteError(error); } }
