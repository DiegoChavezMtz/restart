import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { assertEmploymentUser } from "@/application/use-cases/employability/profileHelpers";
import { UseCaseError } from "@/application/errors";
import { cvDownloadFilename } from "@/application/cvDownloadFilename";
import { buildEmploymentCvPdf } from "@/infrastructure/pdf/buildEmploymentCvPdf";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseCvRepository } from "@/infrastructure/supabase/repositories/SupabaseEmploymentWorkflowRepositories";
export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository()); assertEmploymentUser(user); const cv = await new SupabaseCvRepository().get((await params).id, accessToken); if (!cv) throw new UseCaseError("CV no encontrado.", 404); if (!cv.qualityCheck?.lengthOk || !cv.qualityCheck.noUnconfirmedNumbers || !cv.content.experience.every((entry) => entry.bullets.every((bullet) => bullet.approved))) throw new UseCaseError("El CV debe aprobar el control de calidad antes de exportarse.", 409); const result = await buildEmploymentCvPdf(cv.content); if (result.pageCount !== 1) throw new UseCaseError("El CV excede una página; ajusta el contenido antes de exportar.", 409); return new NextResponse(new Uint8Array(result.pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${cvDownloadFilename(user.fullName, "pdf")}"` } }); } catch (error) { return handleRouteError(error); } }
