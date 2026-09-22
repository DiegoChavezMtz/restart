import { BadgeAlreadyAssertedError, BadgeAssertionNotFoundError, BadgeClassNotFoundError, UseCaseError } from "@/application/errors";
import type { BadgeAssertion, BadgeClass } from "@/domain/entities";
import type {
  BadgeCandidate,
  BadgeRepository,
  CreateBadgeClassInput,
  UpdateBadgeClassInput,
} from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import {
  toDomainBadgeAssertion,
  toDomainPublicBadgeAssertion,
  type PublicBadgeAssertionRow,
} from "@/infrastructure/supabase/mappers/toDomainBadgeAssertion";
import { toDomainBadgeClass } from "@/infrastructure/supabase/mappers/toDomainBadgeClass";
import { toDomainBadgeIssuer } from "@/infrastructure/supabase/mappers/toDomainBadgeIssuer";
import { toDomainUser } from "@/infrastructure/supabase/mappers/toDomainUser";

const IMAGE_BUCKET = "badge-images";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export class SupabaseBadgeRepository implements BadgeRepository {
  async listIssuers(adminAccessToken: string) {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client.from("badge_issuers").select("*").order("created_at");
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainBadgeIssuer);
  }

  async listBadgeClasses(accessToken: string): Promise<BadgeClass[]> {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client
      .from("badge_classes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainBadgeClass);
  }

  async getBadgeClassById(id: string, accessToken: string): Promise<BadgeClass | null> {
    const client = createServerSupabaseClient(accessToken);
    const { data: row, error } = await client.from("badge_classes").select("*").eq("id", id).maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) return null;
    return toDomainBadgeClass(row);
  }

  async createBadgeClass(input: CreateBadgeClassInput, adminAccessToken: string): Promise<BadgeClass> {
    const client = createServerSupabaseClient(adminAccessToken);

    const imageUrl = input.imageFile
      ? await this.uploadImage(client, input.imageFile, adminAccessToken)
      : null;

    const { data: row, error } = await client
      .from("badge_classes")
      .insert({
        issuer_id: input.issuerId,
        name: input.name,
        description: input.description,
        criteria: input.criteria,
        image_url: imageUrl,
        valid_months: input.validMonths,
      })
      .select("*")
      .single();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to create badge class", 500);
    return toDomainBadgeClass(row);
  }

  async updateBadgeClass(
    id: string,
    input: UpdateBadgeClassInput,
    adminAccessToken: string
  ): Promise<BadgeClass> {
    const client = createServerSupabaseClient(adminAccessToken);

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.criteria !== undefined) patch.criteria = input.criteria;
    if (input.validMonths !== undefined) patch.valid_months = input.validMonths;
    if (input.imageFile) {
      patch.image_url = await this.uploadImage(client, input.imageFile, adminAccessToken);
    }

    const { data: row, error } = await client
      .from("badge_classes")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) throw new BadgeClassNotFoundError();
    return toDomainBadgeClass(row);
  }

  private async uploadImage(
    client: ReturnType<typeof createServerSupabaseClient>,
    file: File,
    ownerToken: string
  ): Promise<string> {
    const path = `${ownerToken.slice(0, 8)}-${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) throw new UseCaseError(error.message, 500);
    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async listCandidatesByCohort(
    cohortId: string,
    badgeClassId: string,
    adminAccessToken: string
  ): Promise<BadgeCandidate[]> {
    const client = createServerSupabaseClient(adminAccessToken);

    const { data: users, error: usersError } = await client
      .from("users")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("full_name");
    if (usersError) throw new UseCaseError(usersError.message, 500);

    const { data: assertions, error: assertionsError } = await client
      .from("badge_assertions")
      .select("*")
      .eq("badge_class_id", badgeClassId);
    if (assertionsError) throw new UseCaseError(assertionsError.message, 500);

    const assertionByRecipient = new Map((assertions ?? []).map((row) => [row.recipient_id, row]));

    return (users ?? []).map((userRow) => {
      const assertionRow = assertionByRecipient.get(userRow.id);
      return {
        user: toDomainUser(userRow),
        assertion: assertionRow ? toDomainBadgeAssertion(assertionRow) : null,
      };
    });
  }

  async issueBadgeAssertion(
    input: { badgeClassId: string; recipientId: string; issuedBy: string },
    adminAccessToken: string
  ): Promise<BadgeAssertion> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("badge_assertions")
      .insert({
        badge_class_id: input.badgeClassId,
        recipient_id: input.recipientId,
        issued_by: input.issuedBy,
      })
      .select("*")
      .single();
    if (error?.code === "23505") throw new BadgeAlreadyAssertedError();
    if (error || !row) throw new UseCaseError(error?.message ?? "Failed to issue badge", 500);
    return toDomainBadgeAssertion(row);
  }

  async revokeBadgeAssertion(id: string, revokedBy: string, adminAccessToken: string): Promise<BadgeAssertion> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("badge_assertions")
      .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: revokedBy })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    if (!row) throw new BadgeAssertionNotFoundError();
    return toDomainBadgeAssertion(row);
  }

  async listMyBadgeAssertions(accessToken: string) {
    const client = createServerSupabaseClient(accessToken);
    const { data, error } = await client
      .from("badge_assertions")
      .select("*, badge_classes(*)")
      .order("issued_at", { ascending: false });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map((row) => ({
      ...toDomainBadgeAssertion(row),
      badgeClass: toDomainBadgeClass(row.badge_classes),
    }));
  }

  async getPublicBadgeAssertion(id: string) {
    // Sin token: la RLS de badge_assertions no permitiría leer directo, pero
    // esta función es SECURITY DEFINER y está grant-eada a `anon`.
    const client = createServerSupabaseClient();
    const { data, error } = await client
      .rpc("get_public_badge_assertion", { p_id: id })
      .maybeSingle<PublicBadgeAssertionRow>();
    if (error) throw new UseCaseError(error.message, 500);
    if (!data) return null;
    return toDomainPublicBadgeAssertion(data);
  }
}
