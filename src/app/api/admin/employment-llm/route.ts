import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { ForbiddenError, UseCaseError } from "@/application/errors";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";

export async function GET(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); if (user.role !== "super_admin") throw new ForbiddenError(); const client = createServerSupabaseClient(accessToken); const { data, error } = await client.from("employment_llm_settings").select("minimax_enabled, updated_at").eq("singleton", true).single(); if (error) throw new UseCaseError(error.message, 500); return NextResponse.json({ minimaxEnabled: data.minimax_enabled, updatedAt: data.updated_at }); } catch (error) { return handleRouteError(error); } }
export async function PUT(request: NextRequest) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); if (user.role !== "super_admin") throw new ForbiddenError(); const body = await readJsonObject(request); if (typeof body.minimaxEnabled !== "boolean") throw new UseCaseError("minimaxEnabled debe ser booleano.", 400); const client = createServerSupabaseClient(accessToken); const { data, error } = await client.from("employment_llm_settings").update({ minimax_enabled: body.minimaxEnabled }).eq("singleton", true).select("minimax_enabled, updated_at").single(); if (error) throw new UseCaseError(error.message, 500); return NextResponse.json({ minimaxEnabled: data.minimax_enabled, updatedAt: data.updated_at }); } catch (error) { return handleRouteError(error); } }
