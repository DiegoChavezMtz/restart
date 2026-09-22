import { NextResponse, type NextRequest } from "next/server";
import { handleRouteError } from "@/app/api/_lib/handleRouteError";
import { requireUser } from "@/app/api/_lib/requireUser";
import { InvalidBadgeInputError } from "@/application/errors";
import { createBadgeClass } from "@/application/use-cases/badges/CreateBadgeClass";
import { listBadgeClasses } from "@/application/use-cases/badges/ListBadgeClasses";
import { SupabaseAuthRepository } from "@/infrastructure/supabase/auth/SupabaseAuthRepository";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authRepo = new SupabaseAuthRepository();
    const { user, accessToken } = await requireUser(request, authRepo);

    const badgeRepo = new SupabaseBadgeRepository();
    const classes = await listBadgeClasses(badgeRepo, { requestedBy: user, adminAccessToken: accessToken });

    return NextResponse.json(classes);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
    if (typeof name !== "string") throw new InvalidBadgeInputError("name is required.");

    const badgeRepo = new SupabaseBadgeRepository();
    const badgeClass = await createBadgeClass(badgeRepo, {
      name,
      description: typeof description === "string" ? description : "",
      criteria: typeof criteria === "string" ? criteria : "",
      imageFile: image instanceof File && image.size > 0 ? image : null,
      validMonths: typeof validMonthsRaw === "string" && validMonthsRaw !== "" ? Number(validMonthsRaw) : null,
      requestedBy: user,
      adminAccessToken: accessToken,
    });

    return NextResponse.json(badgeClass, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
