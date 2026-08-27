"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Select } from "@/presentation/atoms/Select";
import { FormField } from "@/presentation/molecules/FormField";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import type { JobKeyword, JobSource, JobTarget } from "@/domain/entities";
import { analyzeJobTarget } from "@/presentation/services/jobTargetService";

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

const Textarea = styled.textarea`
  width: 100%;
  min-height: 180px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-family: inherit;
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};
  resize: vertical;

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }
`;

const KeywordList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

const RELEVANCE_TONE: Record<JobKeyword["relevance"], "success" | "info" | "neutral"> = {
  high: "success",
  medium: "info",
  low: "neutral",
};

export default function NewJobTargetPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [sourceSite, setSourceSite] = useState<JobSource>("linkedin");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [target, setTarget] = useState<JobTarget | null>(null);

  async function handleExtract() {
    if (!rawText.trim() || status === "loading") return;
    setStatus("loading");
    try { setTarget(await analyzeJobTarget({ sourceSite, rawText })); setStatus("done"); } catch { setStatus("idle"); }
  }

  function handleSaveAndContinue() {
    if (target) router.push(`/employment/targets/${target.id}`);
  }

  return (
    <Page>
      <Heading>
        <Title>Analizar una vacante</Title>
        <Subtitle>
          Pega el texto completo de la vacante. La IA solo extrae palabras clave de este texto — nunca busca ni sugiere
          vacantes por su cuenta.
        </Subtitle>
      </Heading>

      <Card>
        <FormField label="Fuente">
          <Select value={sourceSite} onChange={(e) => setSourceSite(e.target.value as JobSource)}>
            <option value="linkedin">LinkedIn</option>
            <option value="indeed">Indeed</option>
            <option value="occ">OCC</option>
            <option value="otro">Otro</option>
          </Select>
        </FormField>
        <FormField label="Texto de la vacante">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Pega aquí el texto completo de la publicación…"
          />
        </FormField>
        <Button onClick={handleExtract} disabled={!rawText.trim() || status === "loading"}>
          Extraer palabras clave
        </Button>
      </Card>

      {status === "loading" && <ProcessingOverlay message="Leyendo la vacante y buscando palabras clave…" />}

      {status === "done" && (
        <Card>
          <Subtitle>Palabras clave detectadas, relevantes para pasar filtros ATS:</Subtitle>
          <KeywordList>
            {target?.keywords.map((kw) => (
              <Badge key={kw.keyword} tone={RELEVANCE_TONE[kw.relevance]}>
                {kw.keyword}
                {kw.matchedInProfile ? " ✓" : ""}
              </Badge>
            ))}
          </KeywordList>
          <Button onClick={handleSaveAndContinue}>Guardar vacante y continuar</Button>
        </Card>
      )}
    </Page>
  );
}
