import type { BadgeIssuer } from "@/domain/entities";

interface BadgeIssuerRow {
  id: string;
  name: string;
  url: string | null;
  email: string | null;
  image_url: string | null;
  created_at: string;
}

export function toDomainBadgeIssuer(row: BadgeIssuerRow): BadgeIssuer {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    email: row.email,
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}
