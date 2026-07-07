"use client";

import styled from "styled-components";
import { QUESTION_ANSWER_REGISTRY } from "@/presentation/registries/questionAnswerRegistry";
import type { Question } from "@/domain/entities";
import type { AnswerValue, QuestionConfig } from "@/domain/value-objects";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
`;

const QuestionLabel = styled.span`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
`;

export interface QuestionAnswerRendererProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  disabled?: boolean;
}

export function QuestionAnswerRenderer({
  question,
  value,
  onChange,
  disabled,
}: QuestionAnswerRendererProps) {
  // Same narrow, intentional escape hatch as QuestionEditorPanel/QuestionRenderer:
  // the registry ties question.type/config/value together by construction.
  const { AnswerInput } = QUESTION_ANSWER_REGISTRY[question.type] as {
    AnswerInput: React.ComponentType<{
      config: QuestionConfig;
      value: AnswerValue | undefined;
      onChange: (value: AnswerValue) => void;
      disabled?: boolean;
    }>;
  };

  return (
    <Wrapper>
      <QuestionLabel>
        {question.label}
        {question.required && " *"}
      </QuestionLabel>
      <AnswerInput config={question.config} value={value} onChange={onChange} disabled={disabled} />
    </Wrapper>
  );
}
