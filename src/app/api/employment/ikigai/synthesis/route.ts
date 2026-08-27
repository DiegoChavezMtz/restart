import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { readJsonObject } from "@/app/api/_lib/readJsonBody";
import { requireUser } from "@/app/api/_lib/requireUser";
import { generateIkigaiSynthesis } from "@/application/use-cases/employability/EmploymentAiActions";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, accessToken } = await requireUser(request, new SupabaseAuthRepository());
    const body = await readJsonObject(request);
    const result = await generateIkigaiSynthesis({
      requestedBy: user,
      accessToken,
      whatYouLove: body.whatYouLove,
      whatYouAreGoodAt: body.whatYouAreGoodAt,
      whatWorldNeeds: body.whatWorldNeeds,
      whatYouCanBePaidFor: body.whatYouCanBePaidFor,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
