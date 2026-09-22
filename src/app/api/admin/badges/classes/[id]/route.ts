import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { InvalidBadgeInputError } from "@/application/errors";
import { updateBadgeClass } from "@/application/use-cases/badges/UpdateBadgeClass";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new InvalidBadgeInputError("Request body must be multipart/form-data.");
    }
    const name = form.get("name");
    const description = form.get("description");
    const criteria = form.get("criteria");
    const validMonthsRaw = form.get("validMonths");
    const image = form.get("image");

    const badgeRepo = new SupabaseBadgeRepository();
    const badgeClass = await updateBadgeClass(badgeRepo, {
      id,
      name: typeof name === "string" ? name : undefined,
      description: typeof description === "string" ? description : undefined,
      criteria: typeof criteria === "string" ? criteria : undefined,
      imageFile: image instanceof File && image.size > 0 ? image : null,
      validMonths: typeof validMonthsRaw === "string" && validMonthsRaw !== "" ? Number(validMonthsRaw) : undefined,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(badgeClass);
  } catch (error) {
    return handleRouteError(error);
  }
}
