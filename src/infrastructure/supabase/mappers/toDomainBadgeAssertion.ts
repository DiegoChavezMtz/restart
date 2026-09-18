import type { BadgeAssertion, PublicBadgeAssertion } from "@/domain/entities";

interface BadgeAssertionRow {
  id: string;
  badge_class_id: string;
  recipient_id: string;
  issued_at: string;
  expires_at: string | null;
  status: string;
  revoked_at: string | null;
  revoked_by: string | null;
  issued_by: string;
}

export function toDomainBadgeAssertion(row: BadgeAssertionRow): BadgeAssertion {
  return {
    id: row.id,
    badgeClassId: row.badge_class_id,
    recipientId: row.recipient_id,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    status: row.status as BadgeAssertion["status"],
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
    issuedBy: row.issued_by,
  };
}

export interface PublicBadgeAssertionRow {
  assertion_id: string;
  status: string;
  issued_at: string;
  expires_at: string | null;
  recipient_name: string;
  badge_class_id: string;
  badge_name: string;
  badge_description: string;
  badge_criteria: string;
  badge_image_url: string | null;
  issuer_name: string;
  issuer_url: string | null;
  issuer_image_url: string | null;
}

export function toDomainPublicBadgeAssertion(row: PublicBadgeAssertionRow): PublicBadgeAssertion {
  return {
    assertionId: row.assertion_id,
    status: row.status as PublicBadgeAssertion["status"],
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    recipientName: row.recipient_name,
    badgeClassId: row.badge_class_id,
    badgeName: row.badge_name,
    badgeDescription: row.badge_description,
    badgeCriteria: row.badge_criteria,
    badgeImageUrl: row.badge_image_url,
    issuerName: row.issuer_name,
    issuerUrl: row.issuer_url,
    issuerImageUrl: row.issuer_image_url,
  };
}
