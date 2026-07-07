"use client";

import { Select } from "@/presentation/atoms/Select";
import { QUESTION_TYPES } from "@/presentation/registries/questionTypeRegistry";
import type { QuestionType } from "@/domain/value-objects";

export interface QuestionTypeSelectorProps {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
  disabled?: boolean;
}

export function QuestionTypeSelector({ value, onChange, disabled }: QuestionTypeSelectorProps) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as QuestionType)}
    >
      {QUESTION_TYPES.map((option) => (
        <option key={option.type} value={option.type}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
