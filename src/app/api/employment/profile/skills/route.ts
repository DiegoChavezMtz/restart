import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { addSkillItem } from "@/application/use-cases/employability/EmploymentProfileActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseEmploymentProfileRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentProfileRepository";
import type { CreateSkillItemInput } from "@/domain/repositories";
export async function POST(request: NextRequest): Promise<NextResponse> { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); const body = await readJsonObject(request); return NextResponse.json(await addSkillItem(new SupabaseEmploymentProfileRepository(), { ...(body as unknown as CreateSkillItemInput), requestedBy: user, accessToken }), { status: 201 }); } catch (error) { return handleRouteError(error); } }
