"use client";

import { useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { Select } from "@/presentation/atoms/Select";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { QuestionTypeSelector } from "@/presentation/molecules/QuestionTypeSelector";
import { QUESTION_TYPE_REGISTRY } from "@/presentation/registries/questionTypeRegistry";
import type { FormSkill, Question, QuestionOptionBranch, QuestionSkillWeight } from "@/domain/entities";
import type { QuestionOptionBranchRuleInput } from "@/domain/repositories";
import { validateQuestionConfig, type QuestionConfig, type QuestionType } from "@/domain/value-objects";

// Codifica la selección de un <select> de salto en un string plano:
// "continue" (default, sin regla) | "end" | "question:<id>".
const CONTINUE = "continue";
const END = "end";
const questionOption = (id: string) => `question:${id}`;

function encodeBranchSelection(branch: QuestionOptionBranch | undefined): string {
  if (!branch) return CONTINUE;
  if (branch.endsForm) return END;
  return questionOption(branch.targetQuestionId as string);
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  justify-content: flex-end;
  z-index: 100;
`;

const Drawer = styled.div`
  width: min(100%, 520px);
  max-width: 100%;
  height: 100%;
  background: ${(props) => props.theme.colors.surfaceElevated};
  padding: ${(props) => props.theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  overflow-y: auto;
  box-shadow: -16px 0 48px rgba(0, 0, 0, 0.28);

  @media (max-width: 640px) {
    width: 100%;
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const Title = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: auto;
  padding-top: ${(props) => props.theme.spacing.md};
  border-top: 1px solid ${(props) => props.theme.colors.border};
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const BranchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
`;

const OptionLabel = styled.span`
  flex: 1;
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
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
  // undefined = no aplica (no es single_choice, o modo "create"); array =
  // reemplaza por completo las reglas de salto de esta pregunta (una entrada
  // por opción que no sea "continuar al orden normal").
  branches?: QuestionOptionBranchRuleInput[];
}

export interface QuestionEditorPanelProps {
  mode: "create" | "edit";
  question?: Question;
  skills: FormSkill[];
  currentSkillWeight?: QuestionSkillWeight;
  // Preguntas del mismo formulario (todas), para el selector de destino de
  // saltos y para detectar reglas que un reordenamiento dejó inválidas.
  allQuestions?: Question[];
  existingBranches?: QuestionOptionBranch[];
  onSave: (input: QuestionEditorPanelInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function QuestionEditorPanel({
  mode,
  question,
  skills,
  currentSkillWeight,
  allQuestions = [],
  existingBranches = [],
  onSave,
  onCancel,
  onDelete,
}: QuestionEditorPanelProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
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
  const [branchTargets, setBranchTargets] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const branch of existingBranches) {
      map[branch.optionValue] = encodeBranchSelection(branch);
    }
    return map;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onCancel]);

  function handleTypeChange(newType: QuestionType) {
    setType(newType);
    setConfig(QUESTION_TYPE_REGISTRY[newType].createDefaultConfig());
  }

  // Solo preguntas posteriores (order mayor) pueden ser destino de un salto —
  // esto es lo que garantiza que un salto siempre avanza, nunca retrocede.
  const laterQuestions =
    mode === "edit" && question
      ? allQuestions
          .filter((q) => q.id !== question.id && q.order > question.order)
          .sort((a, b) => a.order - b.order)
      : [];
  const questionsById = new Map(allQuestions.map((q) => [q.id, q]));

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

    let branches: QuestionEditorPanelInput["branches"];
    if (mode === "edit" && type === "single_choice" && config.type === "single_choice") {
      branches = config.options.reduce<QuestionOptionBranchRuleInput[]>((acc, option) => {
        const selection = branchTargets[option] ?? CONTINUE;
        if (selection === CONTINUE) return acc;
        if (selection === END) {
          acc.push({ optionValue: option, targetQuestionId: null, endsForm: true });
        } else {
          acc.push({
            optionValue: option,
            targetQuestionId: selection.slice("question:".length),
            endsForm: false,
          });
        }
        return acc;
      }, []);
    }

    onSave({ label: label.trim(), type, config, required, timeLimitSeconds, skillWeight, branches });
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
      <Drawer ref={drawerRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <Title id={titleId}>{mode === "create" ? "Nueva pregunta" : "Editar pregunta"}</Title>

        <FormField label="Etiqueta">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </FormField>

        <FormField label="Tipo">
          <QuestionTypeSelector value={type} onChange={handleTypeChange} />
        </FormField>

        <ConfigEditor config={config} onChange={setConfig} />

        {mode === "edit" && type === "single_choice" && config.type === "single_choice" && (
          <FormField label="Saltos condicionales">
            {config.options.map((option, index) => {
              const selection = branchTargets[option] ?? CONTINUE;
              const selectedTargetId = selection.startsWith("question:")
                ? selection.slice("question:".length)
                : null;
              const isConflicting =
                selectedTargetId !== null &&
                !laterQuestions.some((q) => q.id === selectedTargetId);
              const conflictingTarget = selectedTargetId
                ? questionsById.get(selectedTargetId)
                : undefined;

              return (
                <BranchRow key={index}>
                  <OptionLabel>{option || `Opción ${index + 1}`}</OptionLabel>
                  <Select
                    value={selection}
                    onChange={(e) =>
                      setBranchTargets((prev) => ({ ...prev, [option]: e.target.value }))
                    }
                  >
                    <option value={CONTINUE}>Continuar al orden normal</option>
                    <option value={END}>Terminar el formulario aquí</option>
                    {laterQuestions.map((q) => (
                      <option key={q.id} value={questionOption(q.id)}>
                        Ir a: {q.label}
                      </option>
                    ))}
                    {isConflicting && (
                      <option value={selection}>
                        Ir a: {conflictingTarget ? conflictingTarget.label : "(pregunta eliminada)"} (ya
                        no es válido)
                      </option>
                    )}
                  </Select>
                  {isConflicting && <Badge tone="warning">Conflicto</Badge>}
                </BranchRow>
              );
            })}
          </FormField>
        )}

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
            <Button type="button" variant="destructive" onClick={onDelete}>
              Borrar
            </Button>
          )}
        </Actions>
      </Drawer>
    </Backdrop>
  );
}
