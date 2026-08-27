"use client";

import { useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState } from "@/presentation/molecules/AsyncState";
import { mockInsights, type InsightCategory, type MockInsight } from "@/presentation/mock/employmentMock";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 760px;
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

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const InsightCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.lg};
  border-radius: 14px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
`;

const InsightHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
`;

const InsightText = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const SourceExcerpt = styled.p`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-style: italic;
`;

const Actions = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
`;

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  value: "Valor",
  interest: "Interés",
  strength: "Fortaleza",
  work_preference: "Preferencia de trabajo",
  constraint: "Limitante",
  goal: "Meta",
};

export default function ExplorationInsightsPage() {
  const [insights, setInsights] = useState<MockInsight[]>(mockInsights);

  function setStatus(id: string, status: MockInsight["status"]) {
    setInsights((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  const pending = insights.filter((i) => i.status === "pending_review");
  const reviewed = insights.filter((i) => i.status !== "pending_review");

  return (
    <Page>
      <Heading>
        <Title>Hallazgos de Descúbrete</Title>
        <Subtitle>
          Esto es lo que identificamos en tus conversaciones. Nada se agrega a tu perfil sin que tú lo apruebes.
        </Subtitle>
      </Heading>

      <List>
        {pending.length === 0 && (
          <EmptyState title="No hay hallazgos pendientes" description="Sigue platicando en Descúbrete para generar nuevos hallazgos." />
        )}
        {pending.map((insight) => (
          <InsightCard key={insight.id}>
            <InsightHeader>
              <Badge tone="info">{CATEGORY_LABEL[insight.category]}</Badge>
            </InsightHeader>
            <InsightText>{insight.content}</InsightText>
            <SourceExcerpt>“{insight.sourceExcerpt}”</SourceExcerpt>
            <Actions>
              <Button onClick={() => setStatus(insight.id, "accepted")}>Agregar a mi perfil</Button>
              <Button variant="ghost" onClick={() => setStatus(insight.id, "dismissed")}>
                Descartar
              </Button>
            </Actions>
          </InsightCard>
        ))}
      </List>

      {reviewed.length > 0 && (
        <>
          <Heading>
            <Title as="h2" style={{ fontSize: "20px" }}>
              Ya revisados
            </Title>
          </Heading>
          <List>
            {reviewed.map((insight) => (
              <InsightCard key={insight.id}>
                <InsightHeader>
                  <Badge tone="info">{CATEGORY_LABEL[insight.category]}</Badge>
                  <Badge tone={insight.status === "accepted" ? "success" : "neutral"}>
                    {insight.status === "accepted" ? "En tu perfil" : "Descartado"}
                  </Badge>
                </InsightHeader>
                <InsightText>{insight.content}</InsightText>
              </InsightCard>
            ))}
          </List>
        </>
      )}
    </Page>
  );
}
