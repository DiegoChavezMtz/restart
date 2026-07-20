import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import {
  EmailAlreadyRegisteredError,
  EmailNotConfirmedError,
  InvalidAuthInputError,
  InvalidCredentialsError,
  InvalidTokenError,
  UnauthenticatedError,
  UseCaseError,
} from "@/application/errors";
import type { Invitation, User } from "@/domain/entities";
import type {
  AuthRepository,
  AuthSession,
  RegisterViaInvitationInput,
} from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainInvitation } from "@/infrastructure/supabase/mappers/toDomainInvitation";
import { toDomainUser } from "@/infrastructure/supabase/mappers/toDomainUser";

function mapAuthError(error: AuthError | null, fallbackMessage: string): UseCaseError {
  if (error?.code === "invalid_credentials" || error?.message === "Invalid login credentials") {
    return new InvalidCredentialsError();
  }
  if (error?.code === "email_not_confirmed" || error?.message === "Email not confirmed") {
    return new EmailNotConfirmedError();
  }
  if (error?.code === "user_already_exists" || error?.message.toLowerCase().includes("already registered")) {
    return new EmailAlreadyRegisteredError();
  }
  if (error?.code === "weak_password") {
    return new InvalidAuthInputError("La contraseña no cumple con los requisitos de seguridad.");
  }
  return new UseCaseError(fallbackMessage, 502, "AUTH_PROVIDER_ERROR");
}

async function getUserProfile(client: SupabaseClient, userId: string): Promise<User> {
  const { data: row, error } = await client.from("users").select("*").eq("id", userId).single();
  if (error || !row) {
    throw new UseCaseError("User profile not found", 500, "USER_PROFILE_NOT_FOUND");
  }
  return toDomainUser(row);
}

export class SupabaseAuthRepository implements AuthRepository {
  async login(email: string, password: string): Promise<AuthSession> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) throw mapAuthError(error, "Authentication service unavailable");

    return {
      user: await getUserProfile(client, data.session.user.id),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  async logout(accessToken: string, refreshToken: string | null): Promise<void> {
    if (!refreshToken) return; // nothing to revoke — treat as already logged out
    const client = createServerSupabaseClient();
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    await client.auth.signOut();
  }

  async getCurrentUser(accessToken: string): Promise<User | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.auth.getUser(accessToken);
    if (error || !data.user) return null;

    const { data: row } = await client
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();
    if (!row) return null;

    return toDomainUser(row);
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const client = createServerSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    // Supabase does not reveal whether the email exists. Propagating a generic
    // provider failure lets the UI distinguish an outage from a successful,
    // privacy-preserving request.
    if (error) {
      throw new UseCaseError(
        "Password reset service unavailable",
        502,
        "AUTH_PROVIDER_ERROR"
      );
    }
  }

  async resetPassword(tokenHash: string, newPassword: string): Promise<AuthSession> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error || !data.session) throw new InvalidTokenError();

    const { error: updateError } = await client.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw mapAuthError(updateError, "Password could not be updated");

    return {
      user: await getUserProfile(client, data.session.user.id),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session) throw new UnauthenticatedError();

    return {
      user: await getUserProfile(client, data.session.user.id),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  async registerViaInvitation(input: RegisterViaInvitationInput): Promise<AuthSession> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          invitation_token: input.token,
        },
      },
    });
    if (error) throw mapAuthError(error, "Registration service unavailable");

    if (!data.session) {
      // Invitation-based registration must sign the participant in immediately.
      // A missing session here means "Confirm email" is still enabled in the
      // Supabase project (Authentication > Providers > Email) — it must be off.
      throw new UseCaseError(
        "No se pudo iniciar sesión automáticamente tras el registro. Verifica que 'Confirm email' esté desactivado en Supabase (Authentication > Providers > Email).",
        500
      );
    }

    return {
      user: await getUserProfile(client, data.session.user.id),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.rpc("get_invitation_by_token", {
      p_token: token,
    });
    if (error || !data || data.length === 0) return null;
    return toDomainInvitation(data[0]);
  }

  async generateInvitation(
    cohortId: string,
    createdBy: string,
    adminAccessToken: string
  ): Promise<Invitation> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("invitations")
      .insert({ cohort_id: cohortId, created_by: createdBy })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to create invitation", 500);
    return toDomainInvitation(row);
  }

  async deactivateInvitation(invitationId: string, adminAccessToken: string): Promise<void> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error } = await client
      .from("invitations")
      .update({ is_active: false })
      .eq("id", invitationId);
    if (error) throw new UseCaseError(error.message, 500);
  }

  async listInvitationsByCohort(cohortId: string, adminAccessToken: string): Promise<Invitation[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("invitations")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("created_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainInvitation);
  }
}
