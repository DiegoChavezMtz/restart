import type { PublicBadgeAssertion } from "@/domain/entities";

// Open Badges 3.0 (IMS Global) es un perfil de Verifiable Credentials Data
// Model. En este MVP no se firma criptográficamente (sin `proof`) — la
// verificación se apoya en que el JSON se sirve directo desde
// app.empiezadiferente.com, el mismo dominio del issuer.
export function buildOpenBadgeCredential(assertion: PublicBadgeAssertion, verifyUrl: string) {
  return {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
    ],
    id: verifyUrl,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: assertion.issuerUrl ?? verifyUrl,
      type: "Profile",
      name: assertion.issuerName,
      ...(assertion.issuerImageUrl ? { image: { id: assertion.issuerImageUrl, type: "Image" } } : {}),
    },
    validFrom: assertion.issuedAt,
    ...(assertion.expiresAt ? { validUntil: assertion.expiresAt } : {}),
    credentialSubject: {
      type: "AchievementSubject",
      name: assertion.recipientName,
      achievement: {
        id: `${verifyUrl}#achievement-${assertion.badgeClassId}`,
        type: "Achievement",
        name: assertion.badgeName,
        description: assertion.badgeDescription,
        criteria: { narrative: assertion.badgeCriteria },
        ...(assertion.badgeImageUrl ? { image: { id: assertion.badgeImageUrl, type: "Image" } } : {}),
      },
    },
    credentialStatus: {
      id: verifyUrl,
      type: assertion.status === "revoked" ? "RevokedStatus" : "ActiveStatus",
    },
  };
}
