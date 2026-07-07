import { UnauthenticatedError } from "@/application/errors";
import type { AuthRepository } from "@/domain/repositories";
import type { User } from "@/domain/entities";

export async function getCurrentUser(
  repo: AuthRepository,
  accessToken: string
): Promise<User> {
  const user = await repo.getCurrentUser(accessToken);
  if (!user) throw new UnauthenticatedError();
  return user;
}
