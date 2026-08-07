import assert from "node:assert/strict";
import test from "node:test";
import { InvalidAuthInputError, InvitationNotFoundError } from "@/application/errors";
import { loginUser } from "@/application/use-cases/auth/LoginUser";
import { registerViaInvitation } from "@/application/use-cases/auth/RegisterViaInvitation";
import { requestPasswordReset } from "@/application/use-cases/auth/RequestPasswordReset";
import { resetPassword } from "@/application/use-cases/auth/ResetPassword";
import type { AuthRepository, AuthSession } from "@/domain/repositories";

const session: AuthSession = {
  user: {
    id: "user-1",
    email: "ana@example.com",
    fullName: "Ana Pérez",
    role: "usuario",
    cohortId: "cohort-1",
    isActive: true,
    createdAt: "2026-07-14T00:00:00Z",
  },
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: 123,
};

function authRepo() {
  const calls = {
    login: [] as unknown[][],
    register: [] as unknown[][],
    resetRequest: [] as unknown[][],
    reset: [] as unknown[][],
  };
  const repo = {
    async login(...args: unknown[]) {
      calls.login.push(args);
      return session;
    },
    async requestPasswordReset(...args: unknown[]) {
      calls.resetRequest.push(args);
    },
    async resetPassword(...args: unknown[]) {
      calls.reset.push(args);
      return session;
    },
    async registerViaInvitation(...args: unknown[]) {
      calls.register.push(args);
      return session;
    },
    async getInvitationByToken() {
      return {
        id: "invitation-1",
        token: "valid-token",
        cohortId: "cohort-1",
        createdBy: "admin-1",
        isActive: true,
        createdAt: "2026-07-14T00:00:00Z",
      };
    },
  } as unknown as AuthRepository;
  return { repo, calls };
}

test("login normaliza datos y no consulta el repositorio con entradas inválidas", async () => {
  const { repo, calls } = authRepo();
  await loginUser(repo, { email: " ANA@EXAMPLE.COM ", password: "secret" });
  assert.deepEqual(calls.login, [["ana@example.com", "secret"]]);

  assert.throws(
    () => loginUser(repo, { email: "bad", password: "" }),
    InvalidAuthInputError
  );
  assert.equal(calls.login.length, 1);
});

test("registro deriva cohorte y datos normalizados de una invitación válida", async () => {
  const { repo, calls } = authRepo();
  await registerViaInvitation(repo, {
    token: " valid-token ",
    email: " ANA@EXAMPLE.COM ",
    password: "password-seguro",
    fullName: " Ana   Pérez ",
  });
  assert.deepEqual(calls.register, [[{
    token: "valid-token",
    email: "ana@example.com",
    password: "password-seguro",
    fullName: "Ana Pérez",
  }]]);
});

test("registro bloquea una invitación inexistente", async () => {
  const { repo, calls } = authRepo();
  repo.getInvitationByToken = async () => null;
  await assert.rejects(
    registerViaInvitation(repo, {
      token: "invalid-token",
      email: "ana@example.com",
      password: "password-seguro",
      fullName: "Ana Pérez",
    }),
    InvitationNotFoundError
  );
  assert.equal(calls.register.length, 0);
});

test("recuperación normaliza correo y valida contraseña", async () => {
  const { repo, calls } = authRepo();
  await requestPasswordReset(repo, {
    email: " ANA@EXAMPLE.COM ",
    redirectTo: "https://app.example/reset-password",
  });
  assert.deepEqual(calls.resetRequest, [[
    "ana@example.com",
    "https://app.example/reset-password",
  ]]);
  assert.throws(
    () => resetPassword(repo, { tokenHash: "token", newPassword: "short" }),
    InvalidAuthInputError
  );
  assert.equal(calls.reset.length, 0);
});
