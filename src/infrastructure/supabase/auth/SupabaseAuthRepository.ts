import type { AuthError } from "@supabase/supabase-js";
import {
  EmailNotConfirmedError,
  InvalidCredentialsError,
  InvalidTokenError,
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

function mapAuthError(error: AuthError): UseCaseError {
  if (error.message === "Invalid login credentials") {
    return new InvalidCredentialsError();
  }
  if (error.message === "Email not confirmed") {
    return new EmailNotConfirmedError();
  }
  return new UseCaseError(error.message, 500);
}

export class SupabaseAuthRepository implements AuthRepository {
  async login(email: string, password: string): Promise<AuthSession> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) throw mapAuthError(error!);

    const { data: row, error: profileError } = await client
      .from("users")
      .select("*")
      .eq("id", data.session.user.id)
      .single();
    if (profileError || !row) throw new UseCaseError("User profile not found", 500);

    return {
      user: toDomainUser(row),
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
    // Errors are intentionally swallowed — never leak whether the email exists.
    await client.auth.resetPasswordForEmail(email, { redirectTo });
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
    if (updateError) throw new UseCaseError(updateError.message, 500);

    const { data: row, error: profileError } = await client
      .from("users")
      .select("*")
      .eq("id", data.session.user.id)
      .single();
    if (profileError || !row) throw new UseCaseError("User profile not found", 500);

    return {
      user: toDomainUser(row),
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
    if (error || !data.session) throw mapAuthError(error!);

    const { data: row, error: profileError } = await client
      .from("users")
      .select("*")
      .eq("id", data.session.user.id)
      .single();
    if (profileError || !row) throw new UseCaseError("User profile not found", 500);

    return {
      user: toDomainUser(row),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
    };
  }

  async registerViaInvitation(
    input: RegisterViaInvitationInput & { cohortId: string }
  ): Promise<AuthSession> {
    const client = createServerSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          cohort_id: input.cohortId,
          role: "participant",
        },
      },
    });
    if (error) throw mapAuthError(error);

    if (!data.session) {
      // Invitation-based registration must sign the participant in immediately.
      // A missing session here means "Confirm email" is still enabled in the
      // Supabase project (Authentication > Providers > Email) — it must be off.
      throw new UseCaseError(
        "No se pudo iniciar sesión automáticamente tras el registro. Verifica que 'Confirm email' esté desactivado en Supabase (Authentication > Providers > Email).",
        500
      );
    }

    const { data: row, error: profileError } = await client
      .from("users")
      .select("*")
      .eq("id", data.session.user.id)
      .single();
    if (profileError || !row) throw new UseCaseError("User profile not found", 500);

    return {
      user: toDomainUser(row),
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
