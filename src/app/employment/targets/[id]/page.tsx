"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import type { CvVersion, JobKeyword, JobTarget } from "@/domain/entities";
import { generateCv, listCvVersions } from "@/presentation/services/cvService";
import { getJobFitMatrix, getJobTarget, type JobFitMatrix } from "@/presentation/services/jobTargetService";

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

const RawText = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
const FIT_TONE = { demonstrated: "success", partial: "warning", not_demonstrated: "error" } as const;

export default function JobTargetDetailPage() {
  const params = useParams<{ id: string }>();
  const [target, setTarget] = useState<JobTarget | null>(null); const [cvsForTarget, setCvsForTarget] = useState<CvVersion[]>([]); const [matrix, setMatrix] = useState<JobFitMatrix | null>(null); const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>([]); const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { void Promise.all([getJobTarget(params.id), listCvVersions()]).then(([item, cvs]) => { setTarget(item); setCvsForTarget(cvs.filter((cv) => cv.jobTargetId === item.id)); }); }, [params.id]);
  if (!target) return <LoadingState label="Cargando vacante…" />;

  function handleLoadMatrix() {
    if (busy || !target) return;
    setBusy("Comparando tu perfil con la vacante…");
    void getJobFitMatrix(target.id)
      .then((value) => { setMatrix(value); setSelectedExperienceIds([]); })
      .finally(() => setBusy(null));
  }

  function handleGenerateCv() {
    if (busy || !target) return;
    setBusy("Armando tu CV…");
    void generateCv(target.id, selectedExperienceIds)
      .then((cv) => { setCvsForTarget((prev) => [cv, ...prev]); setSelectedExperienceIds([]); setMatrix(null); })
      .finally(() => setBusy(null));
  }

  return (
    <Page>
      <Heading>
        <HeadingText>
          <Title>{target.roleTitle}</Title>
          <Subtitle>{target.companyName}</Subtitle>
        </HeadingText>
      </Heading>

      {cvsForTarget.length > 0 && (
        <Card>
          <Subtitle>CVs generados para esta vacante</Subtitle>
          {cvsForTarget.map((cv) => (
            <Heading key={cv.id}>
              <HeadingText>
                <strong>{cv.title}</strong>
              </HeadingText>
              <Button as={Link} href={`/employment/cv/${cv.id}/build`} variant="secondary">
                Editar
              </Button>
            </Heading>
          ))}
        </Card>
      )}

      <Card>
        <Subtitle>Texto original</Subtitle>
        <RawText>{target.rawText}</RawText>
      </Card>

      <Card>
        <Subtitle>{cvsForTarget.length > 0 ? "Genera otra versión de CV para esta vacante" : "Revisa el ajuste antes de generar tu CV"}</Subtitle>
        {!matrix && <Button variant="secondary" disabled={Boolean(busy)} onClick={handleLoadMatrix}>Ver matriz de ajuste</Button>}
        {matrix?.items.map((item) => <Card key={item.requirement}><strong>{item.requirement}</strong><Badge tone={FIT_TONE[item.status]}>{item.status === "demonstrated" ? "Demostrado" : item.status === "partial" ? "Parcial" : "Sin demostrar"}</Badge><Subtitle>{item.suggestion}</Subtitle>{item.evidence.map((source) => <label key={source.id}><Checkbox checked={source.type !== "experience" || selectedExperienceIds.includes(source.id)} disabled={source.type !== "experience" || Boolean(busy)} onChange={(event) => setSelectedExperienceIds((current) => event.target.checked ? [...current, source.id] : current.filter((id) => id !== source.id))} /> {source.label}</label>)}</Card>)}
        {matrix && (
          <Button disabled={selectedExperienceIds.length === 0 || Boolean(busy)} onClick={handleGenerateCv}>
            {cvsForTarget.length > 0 ? "Generar nueva versión de CV" : "Generar CV para esta vacante"}
          </Button>
        )}
      </Card>

      <Card>
        <Subtitle>Palabras clave ATS</Subtitle>
        <KeywordList>
          {target.keywords.map((kw) => (
            <Badge key={kw.keyword} tone={RELEVANCE_TONE[kw.relevance]}>
              {kw.keyword}
              {kw.matchedInProfile ? " ✓ en tu perfil" : " — no cubierta aún"}
            </Badge>
          ))}
        </KeywordList>
      </Card>
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
