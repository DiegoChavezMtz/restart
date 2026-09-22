import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildOpenBadgeCredential } from "@/application/use-cases/badges/buildOpenBadgeCredential";
import { getPublicBadgeAssertion } from "@/application/use-cases/badges/GetPublicBadgeAssertion";
import { BadgeAssertionNotFoundError } from "@/application/errors";
import { SupabaseBadgeRepository } from "@/infrastructure/supabase/repositories/SupabaseBadgeRepository";
import type { PublicBadgeAssertion } from "@/domain/entities";

type PageParams = { params: Promise<{ id: string }> };

async function getOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function loadAssertion(id: string): Promise<PublicBadgeAssertion | null> {
  try {
    return await getPublicBadgeAssertion(new SupabaseBadgeRepository(), { id });
  } catch (error) {
    if (error instanceof BadgeAssertionNotFoundError) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params;
  const assertion = await loadAssertion(id);
  if (!assertion) return { title: "Insignia no encontrada — Restart" };
  return {
    title: `${assertion.badgeName} — ${assertion.recipientName} | Restart`,
    description: assertion.badgeDescription,
  };
}

export default async function VerifyBadgePage({ params }: PageParams) {
  const { id } = await params;
  const assertion = await loadAssertion(id);
  if (!assertion) notFound();

  const origin = await getOrigin();
  const verifyUrl = `${origin}/badges/verify/${id}`;
  const credential = buildOpenBadgeCredential(assertion, verifyUrl);
  const isActive = assertion.status === "active";

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(credential) }}
      />

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        {assertion.badgeImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assertion.badgeImageUrl} alt={assertion.badgeName} width={120} height={120} style={{ objectFit: "contain" }} />
        )}
      </div>

      <h1 style={{ textAlign: "center", fontSize: 24, marginBottom: 8 }}>{assertion.badgeName}</h1>
      <p
        style={{
          textAlign: "center",
          display: "inline-block",
          width: "100%",
          fontWeight: 600,
          color: isActive ? "#1a7f37" : "#b42318",
          marginBottom: 24,
        }}
      >
        {isActive ? "✓ Credencial activa" : "✕ Credencial revocada"}
      </p>

      <section style={{ border: "1px solid #e2e2e2", borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <p style={{ color: "#666", fontSize: 14 }}>Otorgada a</p>
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{assertion.recipientName}</p>

        <p style={{ color: "#666", fontSize: 14 }}>Descripción</p>
        <p style={{ marginBottom: 16 }}>{assertion.badgeDescription}</p>

        <p style={{ color: "#666", fontSize: 14 }}>Criterios de obtención</p>
        <p style={{ marginBottom: 16 }}>{assertion.badgeCriteria}</p>

        <p style={{ color: "#666", fontSize: 14 }}>Emitida por</p>
        <p style={{ marginBottom: 16 }}>
          {assertion.issuerUrl ? (
            <a href={assertion.issuerUrl} target="_blank" rel="noopener noreferrer">{assertion.issuerName}</a>
          ) : (
            assertion.issuerName
          )}
        </p>

        <p style={{ color: "#666", fontSize: 14 }}>Fecha de emisión</p>
        <p>{new Date(assertion.issuedAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
      </section>

      <p style={{ textAlign: "center", fontSize: 13, color: "#999" }}>
        <a href={`/api/badges/verify/${id}/credential.json`}>Ver credencial en formato Open Badges 3.0</a>
      </p>
    </main>
  );
}
