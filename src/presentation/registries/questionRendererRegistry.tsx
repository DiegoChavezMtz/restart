"use client";

import type { ComponentType } from "react";
import styled from "styled-components";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Radio } from "@/presentation/atoms/Radio";
import { LikertScale } from "@/presentation/molecules/LikertScale";
import type { QuestionConfig, QuestionType } from "@/domain/value-objects";

type ConfigOf<T extends QuestionType> = Extract<QuestionConfig, { type: T }>;

interface QuestionRendererDefinition<T extends QuestionType> {
  type: T;
  Renderer: ComponentType<{ config: ConfigOf<T> }>;
}

const OptionRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const OptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const DisabledTextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textSecondary};
`;

function LikertRenderer({ config }: { config: ConfigOf<"likert"> }) {
  return <LikertScale config={config} />;
}

function OpenTextRenderer({ config }: { config: ConfigOf<"open_text"> }) {
  return (
    <DisabledTextArea
      disabled
      placeholder={
        config.maxLength ? `Respuesta libre (máx. ${config.maxLength} caracteres)` : "Respuesta libre"
      }
    />
  );
}

function SingleChoiceRenderer({ config }: { config: ConfigOf<"single_choice"> }) {
  return (
    <OptionList>
      {config.options.map((option, index) => (
        <OptionRow key={index}>
          <Radio disabled name={`preview-single-${index}`} />
          {option}
        </OptionRow>
      ))}
    </OptionList>
  );
}

function CheckboxRenderer({ config }: { config: ConfigOf<"checkbox"> }) {
  return (
    <OptionList>
      {config.options.map((option, index) => (
        <OptionRow key={index}>
          <Checkbox disabled />
          {option}
        </OptionRow>
      ))}
    </OptionList>
  );
}

export const QUESTION_RENDERER_REGISTRY: { [T in QuestionType]: QuestionRendererDefinition<T> } = {
  likert: { type: "likert", Renderer: LikertRenderer },
  open_text: { type: "open_text", Renderer: OpenTextRenderer },
  single_choice: { type: "single_choice", Renderer: SingleChoiceRenderer },
  checkbox: { type: "checkbox", Renderer: CheckboxRenderer },
};
