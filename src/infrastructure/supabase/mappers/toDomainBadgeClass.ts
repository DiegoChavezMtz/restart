import type { BadgeClass } from "@/domain/entities";

interface BadgeClassRow {
  id: string;
  issuer_id: string;
  name: string;
  description: string;
  criteria: string;
  image_url: string | null;
  valid_months: number | null;
  is_active: boolean;
  created_at: string;
}

export function toDomainBadgeClass(row: BadgeClassRow): BadgeClass {
  return {
    id: row.id,
    issuerId: row.issuer_id,
    name: row.name,
    description: row.description,
    criteria: row.criteria,
    imageUrl: row.image_url,
    validMonths: row.valid_months,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
