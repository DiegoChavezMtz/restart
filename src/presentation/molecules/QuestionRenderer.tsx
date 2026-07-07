"use client";

import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { QUESTION_RENDERER_REGISTRY } from "@/presentation/registries/questionRendererRegistry";
import type { FormSkill, Question } from "@/domain/entities";
import type { QuestionConfig } from "@/domain/value-objects";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
`;

const QuestionLabel = styled.span`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
`;

export interface QuestionRendererProps {
  question: Question;
  skill?: FormSkill;
  weight?: number;
}

export function QuestionRenderer({ question, skill, weight }: QuestionRendererProps) {
  // The registry ties `question.type` and `question.config` together by
  // construction (they're always written/read together) — this cast is the
  // same narrow, intentional escape hatch used by QuestionEditorPanel for
  // its ConfigEditor lookup.
  const { Renderer } = QUESTION_RENDERER_REGISTRY[question.type] as {
    Renderer: React.ComponentType<{ config: QuestionConfig }>;
  };

  return (
    <Wrapper>
      <HeaderRow>
        <QuestionLabel>
          {question.label}
          {question.required && " *"}
        </QuestionLabel>
        {skill && <Badge>{skill.name}{weight != null ? ` · ${weight}` : ""}</Badge>}
      </HeaderRow>
      <Renderer config={question.config} />
    </Wrapper>
  );
}
