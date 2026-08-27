import type { IkigaiProfile } from "@/domain/entities";

interface IkigaiProfileRow {
  id: string;
  user_id: string;
  what_you_love: string;
  what_you_are_good_at: string;
  what_world_needs: string;
  what_you_can_be_paid_for: string;
  synthesis: string | null;
  updated_at: string;
}

export function toDomainIkigaiProfile(row: IkigaiProfileRow): IkigaiProfile {
  return {
    id: row.id,
    userId: row.user_id,
    whatYouLove: row.what_you_love,
    whatYouAreGoodAt: row.what_you_are_good_at,
    whatWorldNeeds: row.what_world_needs,
    whatYouCanBePaidFor: row.what_you_can_be_paid_for,
    synthesis: row.synthesis,
    updatedAt: row.updated_at,
  };
}
