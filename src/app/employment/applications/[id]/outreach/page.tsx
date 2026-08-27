"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { FormField } from "@/presentation/molecules/FormField";
import type { JobApplication } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import { confirmOutreachSent, generateOutreachMessage, getApplication, getOutreachResearch, saveOutreachDraft } from "@/presentation/services/applicationService";

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

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
`;

const CardTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
`;

const ChecklistItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 140px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-family: inherit;
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};
  resize: vertical;
`;

const EMPTY_RESEARCH_FORM = {
  recruiterName: "",
  recruiterRole: "",
  companyTenureNote: "",
  recentCompanyFact: "",
  commonGroundNote: "",
};

export default function OutreachPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [researchForm, setResearchForm] = useState(EMPTY_RESEARCH_FORM);
  const [checklist, setChecklist] = useState({ nameAndRole: false, tenure: false, recentFact: false, commonGround: false });
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getApplication(params.id), getOutreachResearch(params.id)])
      .then(([app, research]) => {
        if (!active) return;
        setApplication(app);
        if (research) {
          setResearchForm({
            recruiterName: research.recruiterName,
            recruiterRole: research.recruiterRole,
            companyTenureNote: research.companyTenureNote,
            recentCompanyFact: research.recentCompanyFact,
            commonGroundNote: research.commonGroundNote,
          });
          setChecklist({
            nameAndRole: Boolean(research.recruiterName),
            tenure: Boolean(research.companyTenureNote),
            recentFact: Boolean(research.recentCompanyFact),
            commonGround: Boolean(research.commonGroundNote),
          });
          setMessage(research.outreachMessage);
          setGenerated(Boolean(research.outreachMessage));
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  const allChecked = Object.values(checklist).every(Boolean);

  async function generateMessage() {
    if (busy || !application) return;
    setBusy("Redactando tu mensaje de contacto…");
    try {
      const result = await generateOutreachMessage(application.id, researchForm);
      setMessage(result.outreachMessage);
      setGenerated(true);
    } finally {
      setBusy(null);
    }
  }
  async function saveDraft() {
    if (busy || !application || !message.trim()) return;
    setBusy("Guardando tu borrador…");
    try { await saveOutreachDraft(application.id, { ...researchForm, outreachMessage: message }); } finally { setBusy(null); }
  }
  async function confirmSent() {
    if (busy || !application || !sentConfirmation) return;
    setBusy("Confirmando el envío…");
    try {
      await saveOutreachDraft(application.id, { ...researchForm, outreachMessage: message });
      const result = await confirmOutreachSent(application.id);
      setApplication(result.application);
    } finally { setBusy(null); }
  }
  if (loading || !application) return <LoadingState label="Cargando postulación…" />;

  return (
    <Page>
      <Heading>
        <Title>Contacto con reclutador</Title>
        <Subtitle>
          {application.companyName} · {application.roleTitle} — contacto por LinkedIn con control humano.
        </Subtitle>
      </Heading>

      <Card>
        <CardTitle>Investigación previa</CardTitle>
        <ChecklistItem>
          <Checkbox checked={checklist.nameAndRole} onChange={(e) => setChecklist((c) => ({ ...c, nameAndRole: e.target.checked }))} />
          Nombre y puesto del reclutador
        </ChecklistItem>
        {checklist.nameAndRole && (
          <>
            <FormField label="Nombre del reclutador">
              <Input
                value={researchForm.recruiterName}
                onChange={(e) => setResearchForm((f) => ({ ...f, recruiterName: e.target.value }))}
              />
            </FormField>
            <FormField label="Puesto del reclutador">
              <Input
                value={researchForm.recruiterRole}
                onChange={(e) => setResearchForm((f) => ({ ...f, recruiterRole: e.target.value }))}
              />
            </FormField>
          </>
        )}
        <ChecklistItem>
          <Checkbox checked={checklist.tenure} onChange={(e) => setChecklist((c) => ({ ...c, tenure: e.target.checked }))} />
          Tiempo en la empresa
        </ChecklistItem>
        {checklist.tenure && (
          <FormField label="Tiempo en la empresa">
            <Input
              value={researchForm.companyTenureNote}
              onChange={(e) => setResearchForm((f) => ({ ...f, companyTenureNote: e.target.value }))}
            />
          </FormField>
        )}
        <ChecklistItem>
          <Checkbox checked={checklist.recentFact} onChange={(e) => setChecklist((c) => ({ ...c, recentFact: e.target.checked }))} />
          Dato reciente de la empresa
        </ChecklistItem>
        {checklist.recentFact && (
          <FormField label="Dato reciente">
            <Input
              value={researchForm.recentCompanyFact}
              onChange={(e) => setResearchForm((f) => ({ ...f, recentCompanyFact: e.target.value }))}
            />
          </FormField>
        )}
        <ChecklistItem>
          <Checkbox checked={checklist.commonGround} onChange={(e) => setChecklist((c) => ({ ...c, commonGround: e.target.checked }))} />
          Punto en común
        </ChecklistItem>
        {checklist.commonGround && (
          <FormField label="Punto en común">
            <Input
              value={researchForm.commonGroundNote}
              onChange={(e) => setResearchForm((f) => ({ ...f, commonGroundNote: e.target.value }))}
            />
          </FormField>
        )}
      </Card>

      <Card>
        <CardTitle>Mensaje de contacto</CardTitle>
        {!allChecked && <p>Completa el checklist para generar un mensaje personalizado.</p>}
        <Button onClick={() => void generateMessage()} disabled={!allChecked || Boolean(busy)}>
          Generar mensaje con IA
        </Button>
        {generated && (
          <FormField label="Mensaje (editable)">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </FormField>
        )}
        {generated && (
          <>
            <Button variant="secondary" onClick={() => void saveDraft()} disabled={Boolean(busy) || !message.trim()}>
              Guardar borrador
            </Button>
            {application.applicationType === "proactive" ? (
              <Badge tone="success">Postulación registrada como proactiva</Badge>
            ) : (
              <>
                <ChecklistItem>
                  <Checkbox checked={sentConfirmation} onChange={(e) => setSentConfirmation(e.target.checked)} />
                  Ya envié este mensaje fuera de Restart
                </ChecklistItem>
                <Button onClick={() => void confirmSent()} disabled={!sentConfirmation || Boolean(busy) || !message.trim()}>
                  Confirmar contacto enviado
                </Button>
                <Badge tone="neutral">Seguirá como reactiva hasta que confirmes el envío.</Badge>
              </>
            )}
          </>
        )}
      </Card>
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
