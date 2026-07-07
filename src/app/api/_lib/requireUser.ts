import type { NextRequest } from "next/server";
import { UnauthenticatedError } from "@/application/errors";
import { getCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import type { AuthRepository } from "@/domain/repositories";
import type { User } from "@/domain/entities";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export async function requireUser(
  request: NextRequest,
  repo: AuthRepository
): Promise<{ user: User; accessToken: string }> {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new UnauthenticatedError();
  const user = await getCurrentUser(repo, accessToken);
  return { user, accessToken };
}
