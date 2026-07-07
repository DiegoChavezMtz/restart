"use client";

import type { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Radio } from "@/presentation/atoms/Radio";
import { LikertScale } from "@/presentation/molecules/LikertScale";
import * as soundService from "@/presentation/services/soundService";
import type { QuestionConfig, QuestionType } from "@/domain/value-objects";

type ConfigOf<T extends QuestionType> = Extract<QuestionConfig, { type: T }>;
type AnswerValueOf<T extends QuestionType> = T extends "likert"
  ? number
  : T extends "open_text"
    ? string
    : T extends "single_choice"
      ? string
      : string[];

interface AnswerInputProps<T extends QuestionType> {
  config: ConfigOf<T>;
  value: AnswerValueOf<T> | undefined;
  onChange: (value: AnswerValueOf<T>) => void;
  disabled?: boolean;
}

interface QuestionAnswerDefinition<T extends QuestionType> {
  type: T;
  AnswerInput: ComponentType<AnswerInputProps<T>>;
}

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  // 16px minimum keeps Safari on iOS from auto-zooming when this is focused.
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-family: inherit;

  &:focus {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 1px;
  }

  &:disabled {
    background: ${(props) => props.theme.colors.surface};
    color: ${(props) => props.theme.colors.textSecondary};
  }
`;

const OptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const OptionRow = styled(motion.label)<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: 8px;
  border: 1px solid
    ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.border)};
  background: ${(props) => (props.$selected ? props.theme.colors.surfaceElevated : "transparent")};
  color: ${(props) => props.theme.colors.textPrimary};
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
`;

function LikertAnswerInput({ config, value, onChange, disabled }: AnswerInputProps<"likert">) {
  return <LikertScale config={config} value={value} onSelect={onChange} disabled={disabled} />;
}

function OpenTextAnswerInput({ config, value, onChange, disabled }: AnswerInputProps<"open_text">) {
  return (
    <TextArea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      maxLength={config.maxLength}
    />
  );
}

function SingleChoiceAnswerInput({
  config,
  value,
  onChange,
  disabled,
}: AnswerInputProps<"single_choice">) {
  const reducedMotion = useReducedMotion();

  function handleSelect(option: string) {
    onChange(option);
    soundService.playSelectSound();
  }

  return (
    <OptionList>
      {config.options.map((option) => (
        <OptionRow
          key={option}
          $selected={value === option}
          whileTap={disabled ? undefined : { scale: reducedMotion ? 1 : 0.96 }}
        >
          <Radio
            name="single-choice-answer"
            checked={value === option}
            onChange={() => handleSelect(option)}
            disabled={disabled}
          />
          {option}
        </OptionRow>
      ))}
    </OptionList>
  );
}

function CheckboxAnswerInput({ config, value, onChange, disabled }: AnswerInputProps<"checkbox">) {
  const reducedMotion = useReducedMotion();
  const selected = value ?? [];
  function toggle(option: string, checked: boolean) {
    onChange(checked ? [...selected, option] : selected.filter((o) => o !== option));
    soundService.playSelectSound();
  }
  return (
    <OptionList>
      {config.options.map((option) => (
        <OptionRow
          key={option}
          $selected={selected.includes(option)}
          whileTap={disabled ? undefined : { scale: reducedMotion ? 1 : 0.96 }}
        >
          <Checkbox
            checked={selected.includes(option)}
            onChange={(e) => toggle(option, e.target.checked)}
            disabled={disabled}
          />
          {option}
        </OptionRow>
      ))}
    </OptionList>
  );
}

export const QUESTION_ANSWER_REGISTRY: { [T in QuestionType]: QuestionAnswerDefinition<T> } = {
  likert: { type: "likert", AnswerInput: LikertAnswerInput },
  open_text: { type: "open_text", AnswerInput: OpenTextAnswerInput },
  single_choice: { type: "single_choice", AnswerInput: SingleChoiceAnswerInput },
  checkbox: { type: "checkbox", AnswerInput: CheckboxAnswerInput },
};
