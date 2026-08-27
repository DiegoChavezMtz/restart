import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { assertEmploymentUser } from "@/application/use-cases/employability/profileHelpers";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseJobTargetRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); assertEmploymentUser(user); const item = await new SupabaseJobTargetRepository().getJobTarget((await params).id, accessToken); return item ? NextResponse.json(item) : NextResponse.json({ error: "Vacante no encontrada" }, { status: 404 }); } catch (error) { return handleRouteError(error); } }
