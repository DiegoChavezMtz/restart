import { UseCaseError } from "@/application/errors";
import type { IkigaiProfile } from "@/domain/entities";
import type { IkigaiRepository, UpdateIkigaiProfileInput } from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainIkigaiProfile } from "@/infrastructure/supabase/mappers/toDomainIkigaiProfile";

export class SupabaseIkigaiRepository implements IkigaiRepository {
  async getIkigaiProfile(accessToken: string): Promise<IkigaiProfile | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client.from("ikigai_profiles").select("*").maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    return row ? toDomainIkigaiProfile(row) : null;
  }

  async upsertIkigaiProfile(
    input: UpdateIkigaiProfileInput,
    accessToken: string
  ): Promise<IkigaiProfile> {
    const client = createServerSupabaseClient(accessToken);
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      throw new UseCaseError(authError?.message ?? "No se pudo identificar al usuario.", 401);
    }

    const { data: row, error } = await client
      .from("ikigai_profiles")
      .upsert(
        {
          user_id: authData.user.id,
          ...(input.whatYouLove !== undefined && { what_you_love: input.whatYouLove }),
          ...(input.whatYouAreGoodAt !== undefined && { what_you_are_good_at: input.whatYouAreGoodAt }),
          ...(input.whatWorldNeeds !== undefined && { what_world_needs: input.whatWorldNeeds }),
          ...(input.whatYouCanBePaidFor !== undefined && {
            what_you_can_be_paid_for: input.whatYouCanBePaidFor,
          }),
          ...(input.synthesis !== undefined && { synthesis: input.synthesis }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "No se pudo guardar el ikigai.", 500);
    return toDomainIkigaiProfile(row);
  }
}
