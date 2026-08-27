import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { updateApplicationStatus } from "@/application/use-cases/employability/ApplicationActions";
import { assertEmploymentUser } from "@/application/use-cases/employability/profileHelpers";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseApplicationRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); assertEmploymentUser(user); const value = await new SupabaseApplicationRepository().get((await params).id, accessToken); return value ? NextResponse.json(value) : NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 }); } catch (error) { return handleRouteError(error); } }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); const body = await readJsonObject(request); return NextResponse.json(await updateApplicationStatus(new SupabaseApplicationRepository(), (await params).id, { ...body, requestedBy: user, accessToken })); } catch (error) { return handleRouteError(error); } }
