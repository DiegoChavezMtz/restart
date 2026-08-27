"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Modal } from "@/presentation/atoms/Modal";
import { FormField } from "@/presentation/molecules/FormField";
import type { CvContent, CvVersion } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import { applyCvSummaryAlternative, draftCvBullet, getCvSummaryAlternatives, getCvVersion, type CvSummaryAlternative, updateCvContent } from "@/presentation/services/cvService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 800px;
`;

const Heading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeadingText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
`;

const ContactLine = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const Summary = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const ExperienceBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding-bottom: ${(props) => props.theme.spacing.md};

  & + & {
    border-top: 1px solid ${(props) => props.theme.colors.border};
    padding-top: ${(props) => props.theme.spacing.md};
  }
`;

const RoleLine = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const OrgLine = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const BulletList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding-left: ${(props) => props.theme.spacing.lg};
`;

const BulletItem = styled.li`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};

  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const BulletText = styled.span`
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const ModalTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const StepText = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: ${(props) => props.theme.spacing.lg};

  @media (max-width: 480px) {
    flex-direction: column-reverse;

    > button {
      width: 100%;
    }
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
`;

type WizardStep = "claim" | "evidence" | "preview";

export default function CvBuilderPage() {
  const params = useParams<{ id: string }>();
  const [cv, setCv] = useState<CvVersion | null>(null);
  const [experience, setExperience] = useState<CvContent["experience"]>([]);
  useEffect(() => { void getCvVersion(params.id).then((item) => { setCv(item); setExperience(item.content.experience); }); }, [params.id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeExperienceId, setActiveExperienceId] = useState<string | null>(null);
  const [step, setStep] = useState<WizardStep>("claim");
  const [claim, setClaim] = useState("");
  const [hasMetric, setHasMetric] = useState<boolean | null>(null);
  const [metricValue, setMetricValue] = useState("");
  const [draftBullets, setDraftBullets] = useState<CvContent["experience"][number]["bullets"]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [summaryAlternatives, setSummaryAlternatives] = useState<CvSummaryAlternative[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function openWizard(experienceEntryId: string) {
    setActiveExperienceId(experienceEntryId);
    setClaim("");
    setHasMetric(null);
    setMetricValue("");
    setDraftBullets([]);
    setSelectedDraftId(null);
    setStep("claim");
    setModalOpen(true);
  }

  function goToEvidenceStep() {
    if (!claim.trim()) return;
    setStep("evidence");
  }

  async function generateBullet() {
    if (busy || !cv || !activeExperienceId || hasMetric === null) return;
    setBusy("Redactando opciones para tu logro…");
    try {
      const result = await draftCvBullet(cv.id, { experienceEntryId: activeExperienceId, claim, metricValue: hasMetric ? metricValue : null, metricConfirmedByUser: hasMetric });
      setDraftBullets(result.bullets);
      setSelectedDraftId(result.bullets[0]?.id ?? null);
      setStep("preview");
    } finally {
      setBusy(null);
    }
  }

  async function confirmBullet() {
    if (busy || !activeExperienceId) return;
    const newBullet = draftBullets.find((bullet) => bullet.id === selectedDraftId);
    if (!newBullet || !cv) return;
    setBusy("Guardando el bullet en tu CV…");
    try {
      const next = experience.map((block) => block.experienceEntryId === activeExperienceId ? { ...block, bullets: [...block.bullets, newBullet] } : block);
      const saved = await updateCvContent(cv.id, { ...cv.content, experience: next });
      setCv(saved);
      setExperience(saved.content.experience);
      setModalOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function toggleApproved(experienceEntryId: string, bulletId: string) {
    if (busy || !cv) return;
    setBusy("Guardando cambios…");
    try {
      const next = experience.map((block) =>
          block.experienceEntryId !== experienceEntryId
            ? block
            : {
                ...block,
                bullets: block.bullets.map((b) => (b.id === bulletId ? { ...b, approved: !b.approved } : b)),
              }
      );
      const saved = await updateCvContent(cv.id, { ...cv.content, experience: next });
      setCv(saved);
      setExperience(saved.content.experience);
    } finally {
      setBusy(null);
    }
  }

  if (!cv) return <LoadingState label="Cargando CV…" />;

  return (
    <Page>
      <Heading>
        <HeadingText>
          <Title>{cv.title}</Title>
          <Subtitle>Cada bullet lo apruebas tú antes de que cuente como parte del CV.</Subtitle>
        </HeadingText>
        <Button as={Link} href={`/employment/cv/${cv.id}/review`}>
          Ir a control de calidad
        </Button>
      </Heading>

      <Card>
        <ContactLine>
          {cv.content.contact.fullName} · {cv.content.contact.email} · {cv.content.contact.phone} · {cv.content.contact.location}
        </ContactLine>
        <Summary>{cv.content.summary}</Summary>
        <Button
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={() => {
            if (busy) return;
            setBusy("Generando opciones de resumen…");
            void getCvSummaryAlternatives(cv.id).then(setSummaryAlternatives).finally(() => setBusy(null));
          }}
        >
          Proponer headline y resumen
        </Button>
        {summaryAlternatives.map((alternative) => (
          <Card key={`${alternative.headline}-${alternative.summary}`}>
            <RoleLine>{alternative.headline}</RoleLine>
            <Summary>{alternative.summary}</Summary>
            <Button
              disabled={Boolean(busy)}
              onClick={() => {
                if (busy) return;
                setBusy("Aplicando el nuevo resumen…");
                void applyCvSummaryAlternative(cv.id, alternative).then((saved) => { setCv(saved); setSummaryAlternatives([]); }).finally(() => setBusy(null));
              }}
            >
              Usar esta propuesta
            </Button>
          </Card>
        ))}
      </Card>

      <Card>
        {experience.map((block) => (
          <ExperienceBlock key={block.experienceEntryId}>
            <RoleLine>{block.role}</RoleLine>
            <OrgLine>
              {block.organization} · {block.location} · {block.startDate} — {block.endDate ?? "presente"}
            </OrgLine>
            <BulletList>
              {block.bullets.map((bullet) => (
                <BulletItem key={bullet.id}>
                  <BulletText>{bullet.text}</BulletText>
                  <Badge tone={bullet.evidenceId ? "success" : "neutral"}>
                    {bullet.evidenceId ? "Con evidencia" : "Cualitativo"}
                  </Badge>
                  <Button variant={bullet.approved ? "secondary" : "primary"} disabled={Boolean(busy)} onClick={() => void toggleApproved(block.experienceEntryId, bullet.id)}>
                    {bullet.approved ? "Aprobado" : "Aprobar"}
                  </Button>
                </BulletItem>
              ))}
            </BulletList>
            <Footer>
              <Button variant="ghost" disabled={Boolean(busy)} onClick={() => openWizard(block.experienceEntryId)}>
                + Agregar logro
              </Button>
            </Footer>
          </ExperienceBlock>
        ))}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} ariaLabel="Agregar logro al CV">
        {step === "claim" && (
          <>
            <ModalTitle>¿Qué lograste?</ModalTitle>
            <StepText>Descríbelo en tus palabras, sin preocuparte todavía por cifras exactas.</StepText>
            <FormField label="Logro">
              <Input value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="Ej. Mejoré la atención a proveedores" />
            </FormField>
            <ModalActions>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={goToEvidenceStep} disabled={!claim.trim()}>Siguiente</Button>
            </ModalActions>
          </>
        )}
        {step === "evidence" && (
          <>
            <ModalTitle>Antes de redactarlo, confírmame el dato</ModalTitle>
            <StepText>¿Cuántas veces, con qué frecuencia, o con qué resultado concreto? Si no tienes el dato, no hay problema.</StepText>
            <FormField label="¿Tienes un dato confirmado?">
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant={hasMetric === true ? "primary" : "secondary"} onClick={() => setHasMetric(true)}>Sí, tengo el dato</Button>
                <Button variant={hasMetric === false ? "primary" : "secondary"} onClick={() => setHasMetric(false)}>No lo tengo</Button>
              </div>
            </FormField>
            {hasMetric && (
              <FormField label="Cantidad, frecuencia o resultado">
                <Input value={metricValue} onChange={(e) => setMetricValue(e.target.value)} placeholder="Ej. Reduje el tiempo de respuesta de 3 a 1 día" />
              </FormField>
            )}
            <ModalActions>
              <Button variant="ghost" onClick={() => setStep("claim")}>Atrás</Button>
              <Button onClick={() => void generateBullet()} disabled={Boolean(busy) || hasMetric === null || (hasMetric && !metricValue.trim())}>
                Redactar bullet
              </Button>
            </ModalActions>
          </>
        )}
        {step === "preview" && (
          <>
            <ModalTitle>Bullet propuesto</ModalTitle>
            <StepText>Elige una alternativa o vuelve para ajustar la evidencia.</StepText>
            {draftBullets.map((bullet) => (
              <Button key={bullet.id} variant={selectedDraftId === bullet.id ? "primary" : "secondary"} onClick={() => setSelectedDraftId(bullet.id)}>
                {bullet.text}
              </Button>
            ))}
            <Badge tone={hasMetric ? "success" : "neutral"}>{hasMetric ? "Con dato confirmado" : "Redactado en términos cualitativos"}</Badge>
            <ModalActions>
              <Button variant="ghost" onClick={() => setStep("evidence")}>Ajustar</Button>
              <Button onClick={() => void confirmBullet()} disabled={Boolean(busy) || !selectedDraftId}>Agregar al CV</Button>
            </ModalActions>
          </>
        )}
      </Modal>
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
