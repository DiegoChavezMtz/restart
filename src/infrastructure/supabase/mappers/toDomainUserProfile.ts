import type { UserProfile } from "@/domain/entities";

interface UserProfileRow {
  id: string;
  user_id: string;
  phone: string;
  location: string;
  linkedin_url: string | null;
  updated_at: string;
}

export function toDomainUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    phone: row.phone,
    location: row.location,
    linkedinUrl: row.linkedin_url,
    updatedAt: row.updated_at,
  };
}
