import type { AuthRepository, AuthSession } from "@/domain/repositories";

export function loginUser(
  repo: AuthRepository,
  input: { email: string; password: string }
): Promise<AuthSession> {
  return repo.login(input.email, input.password);
}
