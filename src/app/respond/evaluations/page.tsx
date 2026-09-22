"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as evaluationService from "@/presentation/services/evaluationService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 900px;
  min-width: 0;
`;

const Heading = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Meta = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const Card = styled.article`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.xl};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.lg};
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const EvaluationInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${(props) => props.theme.spacing.xs};
  min-width: 0;
`;

const EvaluationTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  overflow-wrap: anywhere;
`;

const EvaluationAction = styled(Button)`
  flex-shrink: 0;
  min-width: 170px;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

function date(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`)
  );
}

export default function ParticipantEvaluationsPage() {
  const [items, setItems] = useState<evaluationService.ParticipantEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    evaluationService
      .listEvaluations()
      .then((data) => setItems(data as evaluationService.ParticipantEvaluation[]))
      .catch(() => setError("No se pudieron cargar tus evaluaciones."))
      .finally(() => setLoading(false));
  }, []);

  async function download(item: evaluationService.ParticipantEvaluation) {
    try {
      await evaluationService.openEvaluationPdf(item.evaluation.id, item.assignmentId);
    } catch {
      setError("No se pudo preparar la descarga.");
    }
  }

  return (
    <Page>
      <Heading>
        <Button as={Link} href="/respond" variant="ghost">← Mi espacio</Button>
        <Title>Mis evaluaciones</Title>
        <Meta>Consulta las evaluaciones de tu cohorte por periodo.</Meta>
      </Heading>
      {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
      {loading ? (
        <LoadingState label="Cargando tus evaluaciones…" />
      ) : items.length === 0 ? (
        <EmptyState title="Aún no tienes evaluaciones" description="Cuando te asignen una, aparecerá aquí." />
      ) : (
        items.map((item) => (
          <Card key={item.assignmentId}>
            <EvaluationInfo>
              <EvaluationTitle>{item.evaluation.title}</EvaluationTitle>
              <Meta>{date(item.evaluation.periodStart)} al {date(item.evaluation.periodEnd)}</Meta>
              {item.result ? (
                <Badge tone="success">Calificación: {item.result.score}/100</Badge>
              ) : (
                <Badge tone="warning">Pendiente de evaluación</Badge>
              )}
            </EvaluationInfo>
            {item.result && <EvaluationAction onClick={() => download(item)}>Ver evaluación</EvaluationAction>}
          </Card>
        ))
      )}
    </Page>
  );
}
