"use client";

import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { LikertDistributionChart } from "@/presentation/molecules/LikertDistributionChart";
import { OptionPercentageChart } from "@/presentation/molecules/OptionPercentageChart";
import type { GetCohortStatsForFormResult } from "@/presentation/services/statsService";

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const HeaderTitle = styled.h3`
  font-size: ${(props) => props.theme.typography.fontSize.md};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const QuestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
`;

const QuestionCard = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
`;

const QuestionLabel = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  margin-bottom: ${(props) => props.theme.spacing.sm};
`;

const Meta = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const OpenTextList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  padding-left: ${(props) => props.theme.spacing.md};
  color: ${(props) => props.theme.colors.textPrimary};
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
                <LikertDistributionChart breakdown={likert} />
              </>
            )}

            {choice && (
              <>
                <Meta>Sin respuesta: {choice.noAnswerCount}</Meta>
                <OptionPercentageChart breakdown={choice} />
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
