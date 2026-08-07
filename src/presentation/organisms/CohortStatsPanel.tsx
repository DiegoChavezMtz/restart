"use client";

import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { LikertDistributionChart } from "@/presentation/molecules/LikertDistributionChart";
import { OptionPercentageChart } from "@/presentation/molecules/OptionPercentageChart";
import type { GetCohortStatsForFormResult } from "@/presentation/services/statsService";

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.lg};
  padding: ${(props) => props.theme.spacing.lg};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 14px;
  background: ${(props) => props.theme.colors.background};
  min-width: 0;

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const HeaderTitle = styled.h3`
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const QuestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
`;

const QuestionCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 14px;
  background: ${(props) => props.theme.colors.background};
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  @media (max-width: 640px) {
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const QuestionLabel = styled.p`
  overflow-wrap: anywhere;
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  font-size: ${(props) => props.theme.typography.fontSize.md};
`;

const Meta = styled.p`
  overflow-wrap: anywhere;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const ChartLabel = styled.p`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const ChartFrame = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const OpenTextList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  padding-left: ${(props) => props.theme.spacing.md};
  color: ${(props) => props.theme.colors.textPrimary};
  overflow-wrap: anywhere;
  word-break: break-word;
`;

export interface CohortStatsPanelProps {
  result: GetCohortStatsForFormResult;
}

export function CohortStatsPanel({ result }: CohortStatsPanelProps) {
  return (
    <>
      <Header>
        <HeaderTitle>
          {result.completedCount} / {result.totalParticipants} participantes completaron
        </HeaderTitle>
        <Badge tone={result.completionRate === 100 ? "success" : "neutral"}>
          {result.completionRate}% de finalización
        </Badge>
      </Header>

      <QuestionList>
        {result.breakdown.map(({ question, likert, choice, openText }) => (
          <QuestionCard key={question.id}>
            <QuestionLabel>{question.label}</QuestionLabel>

            {likert && (
              <>
                <Meta>
                  Promedio: {likert.average} · Sin respuesta: {likert.noAnswerCount}
                </Meta>
                <ChartLabel>Distribución de respuestas</ChartLabel>
                <ChartFrame><LikertDistributionChart breakdown={likert} /></ChartFrame>
              </>
            )}

            {choice && (
              <>
                <Meta>Sin respuesta: {choice.noAnswerCount}</Meta>
                <ChartLabel>Porcentaje por opción</ChartLabel>
                <ChartFrame><OptionPercentageChart breakdown={choice} /></ChartFrame>
              </>
            )}

            {openText && (
              <>
                <Meta>Sin respuesta: {openText.noAnswerCount}</Meta>
                <OpenTextList>
                  {openText.answers.map((answer, index) => (
                    <li key={index}>{answer}</li>
                  ))}
                </OpenTextList>
              </>
            )}
          </QuestionCard>
        ))}
      </QuestionList>
    </>
  );
}
