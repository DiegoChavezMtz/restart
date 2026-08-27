import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { deleteSkillItem, updateSkillItem } from "@/application/use-cases/employability/EmploymentProfileActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); return NextResponse.json(await updateSkillItem(new SupabaseEmploymentProfileRepository(), (await params).id, { ...(await readJsonObject(request)), requestedBy: user, accessToken })); } catch (error) { return handleRouteError(error); } }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); await deleteSkillItem(new SupabaseEmploymentProfileRepository(), (await params).id, { requestedBy: user, accessToken }); return new NextResponse(null, { status: 204 }); } catch (error) { return handleRouteError(error); } }
