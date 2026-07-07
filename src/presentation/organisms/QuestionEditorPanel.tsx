"use client";

import { useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { Select } from "@/presentation/atoms/Select";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { QuestionTypeSelector } from "@/presentation/molecules/QuestionTypeSelector";
import { QUESTION_TYPE_REGISTRY } from "@/presentation/registries/questionTypeRegistry";
import type { FormSkill, Question, QuestionSkillWeight } from "@/domain/entities";
import { validateQuestionConfig, type QuestionConfig, type QuestionType } from "@/domain/value-objects";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: flex-end;
  z-index: 100;
`;

const Drawer = styled.div`
  width: 400px;
  max-width: 100%;
  height: 100%;
  background: ${(props) => props.theme.colors.surfaceElevated};
  padding: ${(props) => props.theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  overflow-y: auto;
`;

const Title = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Actions = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: auto;
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  color: ${(props) => props.theme.colors.textPrimary};
`;

export interface QuestionEditorPanelInput {
  label: string;
  type: QuestionType;
  config: QuestionConfig;
  required: boolean;
  timeLimitSeconds: number | null;
  // undefined = no cambia (no aplica, pregunta no-likert sin mapeo previo);
  // null = borrar el mapeo existente; objeto = fijar skill+peso.
  skillWeight?: { skillId: string; weight: number } | null;
}

export interface QuestionEditorPanelProps {
  mode: "create" | "edit";
  question?: Question;
  skills: FormSkill[];
  currentSkillWeight?: QuestionSkillWeight;
  onSave: (input: QuestionEditorPanelInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function QuestionEditorPanel({
  mode,
  question,
  skills,
  currentSkillWeight,
  onSave,
  onCancel,
  onDelete,
}: QuestionEditorPanelProps) {
  const [label, setLabel] = useState(question?.label ?? "");
  const [type, setType] = useState<QuestionType>(question?.type ?? "likert");
  const [config, setConfig] = useState<QuestionConfig>(
    question?.config ?? QUESTION_TYPE_REGISTRY.likert.createDefaultConfig()
  );
  const [required, setRequired] = useState(question?.required ?? true);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(
    question?.timeLimitSeconds ?? null
  );
  const [skillId, setSkillId] = useState(currentSkillWeight?.skillId ?? "");
  const [weight, setWeight] = useState(currentSkillWeight?.weight ?? 1);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(newType: QuestionType) {
    setType(newType);
    setConfig(QUESTION_TYPE_REGISTRY[newType].createDefaultConfig());
  }

  function handleSave() {
    if (label.trim().length === 0) {
      setError("La etiqueta no puede estar vacía.");
      return;
    }
    const configError = validateQuestionConfig(config);
    if (configError) {
      setError(configError);
      return;
    }

    let skillWeight: QuestionEditorPanelInput["skillWeight"];
    if (type !== "likert") {
      skillWeight = currentSkillWeight ? null : undefined;
    } else if (skillId === "") {
      skillWeight = currentSkillWeight ? null : undefined;
    } else {
      skillWeight = { skillId, weight };
    }

    onSave({ label: label.trim(), type, config, required, timeLimitSeconds, skillWeight });
  }

  // The registry ties `type` and `config` together at runtime (handleTypeChange
  // always resets config via createDefaultConfig for the new type), but that
  // invariant isn't expressible to TS through a dynamic key lookup — this is
  // the one narrow, intentional escape hatch for the registry pattern.
  const ConfigEditor = QUESTION_TYPE_REGISTRY[type].ConfigEditor as React.ComponentType<{
    config: QuestionConfig;
    onChange: (config: QuestionConfig) => void;
  }>;

  return (
    <Backdrop onClick={onCancel}>
      <Drawer onClick={(e) => e.stopPropagation()}>
        <Title>{mode === "create" ? "Nueva pregunta" : "Editar pregunta"}</Title>

        <FormField label="Etiqueta">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </FormField>

        <FormField label="Tipo">
          <QuestionTypeSelector value={type} onChange={handleTypeChange} />
        </FormField>

        <ConfigEditor config={config} onChange={setConfig} />

        {type === "likert" && (
          <>
            <FormField label="Habilidad (opcional)">
              <Select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                <option value="">Sin habilidad</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </Select>
            </FormField>
            {skillId !== "" && (
              <FormField label="Peso (1-5)">
                <Select value={weight} onChange={(e) => setWeight(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </>
        )}

        <FormField label="Límite de tiempo en segundos (opcional)">
          <Input
            type="number"
            value={timeLimitSeconds ?? ""}
            onChange={(e) =>
              setTimeLimitSeconds(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </FormField>

        <CheckboxRow>
          <Checkbox checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Obligatoria
        </CheckboxRow>

        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}

        <Actions>
          <Button type="button" onClick={handleSave}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          {mode === "edit" && onDelete && (
            <Button type="button" variant="secondary" onClick={onDelete}>
              Borrar
            </Button>
          )}
        </Actions>
      </Drawer>
    </Backdrop>
  );
}
