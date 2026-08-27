import { UseCaseError } from "@/application/errors";
import type { UserProfile } from "@/domain/entities";
import type { UpsertUserProfileInput, UserProfileRepository } from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainUserProfile } from "@/infrastructure/supabase/mappers/toDomainUserProfile";

export class SupabaseUserProfileRepository implements UserProfileRepository {
  async getUserProfile(accessToken: string): Promise<UserProfile | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client.from("user_profiles").select("*").maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    return data ? toDomainUserProfile(data) : null;
  }

  async upsertUserProfile(input: UpsertUserProfileInput, accessToken: string): Promise<UserProfile> {
    const client = createServerSupabaseClient(accessToken);
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      throw new UseCaseError(authError?.message ?? "No se pudo identificar al usuario.", 401);
    }

    const { data, error } = await client
      .from("user_profiles")
      .upsert(
        {
          user_id: authData.user.id,
          ...(input.phone !== undefined && { phone: input.phone }),
          ...(input.location !== undefined && { location: input.location }),
          ...(input.linkedinUrl !== undefined && { linkedin_url: input.linkedinUrl }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();
    if (error || !data) throw new UseCaseError(error?.message ?? "No se pudo guardar tu información de contacto.", 500);
    return toDomainUserProfile(data);
  }

  async updateOwnFullName(fullName: string, accessToken: string): Promise<void> {
    const client = createServerSupabaseClient(accessToken);
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      throw new UseCaseError(authError?.message ?? "No se pudo identificar al usuario.", 401);
    }
    const { error } = await client.from("users").update({ full_name: fullName }).eq("id", authData.user.id);
    if (error) throw new UseCaseError(error.message, 500);
  }
}
