"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import type { CvVersion } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import { downloadCvPdf, downloadCvWord, getCvVersion, markCvAsSent, runQualityCheck } from "@/presentation/services/cvService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 720px;
`;

const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const CheckList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
`;

const CheckRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.sm} 0;

  & + & {
    border-top: 1px solid ${(props) => props.theme.colors.border};
  }
`;

const CheckLabel = styled.span`
  color: ${(props) => props.theme.colors.textPrimary};
`;

const BlockedNote = styled.p`
  color: ${(props) => props.theme.colors.error};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const FooterActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};

  @media (max-width: 640px) {
    flex-direction: column;

    > button {
      width: 100%;
    }
  }
`;

const IssueList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  padding-left: ${(props) => props.theme.spacing.lg};
`;

const IssueItem = styled.li`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

export default function CvQualityReviewPage() {
  const params = useParams<{ id: string }>();
  const [cv, setCv] = useState<CvVersion | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void getCvVersion(params.id).then(setCv); }, [params.id]);
  if (!cv) return <LoadingState label="Cargando control de calidad…" />;

  const hasRunCheck = cv.qualityCheck !== null;
  const allUnapprovedBullets = cv.content.experience.flatMap((block) => block.bullets.filter((b) => !b.approved));
  const unconfirmedNumberBullets = cv.content.experience.flatMap((block) => block.bullets.filter((b) => /\d/.test(b.text) && !b.evidenceId));
  const bulletCount = cv.content.experience.reduce((count, block) => count + block.bullets.length, 0);
  const hasUsefulContent = Boolean(
    cv.content.contact.fullName.trim() && cv.content.contact.email.trim() && cv.content.summary.trim() && bulletCount > 0
  );

  const checks = [
    { label: "Revisión básica de redacción", ok: hasRunCheck && cv.qualityCheck!.spellingOk },
    { label: "Extensión de una página", ok: hasRunCheck && cv.qualityCheck!.lengthOk },
    { label: "Sin cifras no confirmadas", ok: unconfirmedNumberBullets.length === 0 },
    { label: "Todos los bullets aprobados", ok: allUnapprovedBullets.length === 0 },
    { label: "Tiene al menos un logro redactado", ok: bulletCount > 0 },
    { label: "Contacto y resumen completos", ok: hasUsefulContent },
  ];

  const canMarkAsSent = hasRunCheck && checks.every((c) => c.ok) && cv.status !== "sent";

  async function handleRunCheck() {
    if (busy) return;
    setBusy("Revisando ortografía, extensión y coherencia…");
    setError(null);
    try {
      setCv(await runQualityCheck(cv!.id));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "No se pudo ejecutar el control de calidad.");
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkAsSent() {
    if (busy) return;
    setBusy("Marcando tu CV como enviado…");
    setError(null);
    try {
      setCv(await markCvAsSent(cv!.id));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "No se pudo marcar el CV como enviado.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    if (busy || !cv) return;
    setBusy("Dándole brillo a tu CV…");
    setError(null);
    try {
      await downloadCvPdf(cv.id, cv.content.contact.fullName);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadWord() {
    if (busy || !cv) return;
    setBusy("Preparando tu CV en Word…");
    setError(null);
    try {
      await downloadCvWord(cv.id, cv.content.contact.fullName);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "No se pudo descargar el archivo Word.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Page>
      <Heading>
        <Title>Control de calidad</Title>
        <Subtitle>Revisa redacción, extensión y evidencia antes de exportar o marcar el CV como enviado.</Subtitle>
      </Heading>

      {!hasRunCheck && <BlockedNote>Aún no se ha ejecutado la revisión básica de redacción, extensión y coherencia. Ejecútala antes de continuar.</BlockedNote>}

      <CheckList>
        {checks.map((check) => (
          <CheckRow key={check.label}>
            <CheckLabel>{check.label}</CheckLabel>
            <Badge tone={check.ok ? "success" : "error"}>{check.ok ? "OK" : "Pendiente"}</Badge>
          </CheckRow>
        ))}
      </CheckList>

      {(cv.qualityCheck?.spellingIssues.length ?? 0) > 0 && (
        <CheckList>
          <CheckLabel>Detalle de ortografía y redacción</CheckLabel>
          <IssueList>
            {cv.qualityCheck!.spellingIssues.map((issue, index) => (
              <IssueItem key={index}>{issue}</IssueItem>
            ))}
          </IssueList>
        </CheckList>
      )}

      {(cv.qualityCheck?.coherenceNotes.length ?? 0) > 0 && (
        <CheckList>
          <CheckLabel>Sugerencias de claridad y coherencia</CheckLabel>
          <IssueList>
            {cv.qualityCheck!.coherenceNotes.map((note, index) => (
              <IssueItem key={index}>{note}</IssueItem>
            ))}
          </IssueList>
        </CheckList>
      )}

      {hasRunCheck && <Subtitle>Medición de layout: {cv.qualityCheck?.layoutPageCount ?? "—"} página(s).</Subtitle>}

      {error && <BlockedNote>{error}</BlockedNote>}

      {hasRunCheck && !canMarkAsSent && cv.status !== "sent" && (
        <BlockedNote>
          No puedes marcar este CV como enviado hasta resolver los puntos pendientes
          {unconfirmedNumberBullets.length > 0 && " — hay una cifra sin evidencia confirmada"}
          {bulletCount === 0 && " — agrega al menos un logro en tu experiencia"}
          {bulletCount > 0 && !hasUsefulContent && " — falta completar contacto o resumen"}
          .
        </BlockedNote>
      )}

      <Footer>
        <Badge tone={cv.status === "sent" ? "success" : "neutral"}>{cv.status === "sent" ? "Enviado" : "Aún no enviado"}</Badge>
        <FooterActions>
          <Button variant="secondary" onClick={() => void handleRunCheck()} disabled={Boolean(busy)}>
            {hasRunCheck ? "Repetir control de calidad" : "Ejecutar control de calidad"}
          </Button>
          <Button onClick={() => void handleMarkAsSent()} disabled={!canMarkAsSent || Boolean(busy)}>
            Marcar como enviado
          </Button>
          <Button variant="secondary" onClick={() => void handleDownloadPdf()} disabled={(!canMarkAsSent && cv.status !== "sent") || Boolean(busy)}>Descargar PDF ATS</Button>
          <Button variant="secondary" onClick={() => void handleDownloadWord()} disabled={(!canMarkAsSent && cv.status !== "sent") || Boolean(busy)}>Descargar Word</Button>
        </FooterActions>
      </Footer>
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
