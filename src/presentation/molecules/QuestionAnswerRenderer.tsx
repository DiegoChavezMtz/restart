"use client";

import styled from "styled-components";
import { QUESTION_ANSWER_REGISTRY } from "@/presentation/registries/questionAnswerRegistry";
import type { Question } from "@/domain/entities";
import type { AnswerValue, QuestionConfig } from "@/domain/value-objects";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const QuestionLabel = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  line-height: ${(props) => props.theme.typography.lineHeight.normal};
`;

const Required = styled.span`
  color: ${(props) => props.theme.colors.error};
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
        {question.required && <Required aria-label="Obligatoria"> *</Required>}
      </QuestionLabel>
      <AnswerInput config={question.config} value={value} onChange={onChange} disabled={disabled} />
    </Wrapper>
  );
}
