import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { assertEmploymentUser } from "@/application/use-cases/employability/profileHelpers";
import { renameCvVersion, updateCvContent } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCvRepository, SupabaseEvidenceRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
const auth = new SupabaseAuthRepository(), cv = new SupabaseCvRepository();
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, auth); assertEmploymentUser(user); const item = await cv.get((await params).id, accessToken); return item ? NextResponse.json(item) : NextResponse.json({ error: "CV no encontrado" }, { status: 404 }); } catch (error) { return handleRouteError(error); } }
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, auth); assertEmploymentUser(user); const body = await readJsonObject(request); return NextResponse.json(await updateCvContent({ cv, evidence: new SupabaseEvidenceRepository() }, { requestedBy: user, accessToken, cvId: (await params).id, content: body.content })); } catch (error) { return handleRouteError(error); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, auth); assertEmploymentUser(user); const body = await readJsonObject(request); return NextResponse.json(await renameCvVersion({ cv }, { requestedBy: user, accessToken, cvId: (await params).id, title: body.title })); } catch (error) { return handleRouteError(error); } }
