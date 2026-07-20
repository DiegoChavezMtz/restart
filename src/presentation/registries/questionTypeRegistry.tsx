"use client";

import type { ComponentType } from "react";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { FormField } from "@/presentation/molecules/FormField";
import { OptionsListEditor } from "@/presentation/molecules/OptionsListEditor";
import type { QuestionConfig, QuestionType } from "@/domain/value-objects";

type ConfigOf<T extends QuestionType> = Extract<QuestionConfig, { type: T }>;

interface ConfigEditorProps<T extends QuestionType> {
  config: ConfigOf<T>;
  onChange: (config: ConfigOf<T>) => void;
}

interface QuestionTypeDefinition<T extends QuestionType> {
  type: T;
  label: string;
  createDefaultConfig: () => ConfigOf<T>;
  ConfigEditor: ComponentType<ConfigEditorProps<T>>;
}

function resizeLikertLabels(labels: string[], length: number): string[] {
  return Array.from({ length }, (_, i) => labels[i] ?? "");
}

function LikertConfigEditor({ config, onChange }: ConfigEditorProps<"likert">) {
  const pointCount = config.scaleMax - config.scaleMin + 1;
  const hasLabels = Boolean(config.labels && config.labels.length > 0);

  function updateScaleMin(scaleMin: number) {
    const labels = hasLabels
      ? resizeLikertLabels(config.labels!, config.scaleMax - scaleMin + 1)
      : config.labels;
    onChange({ ...config, scaleMin, labels });
  }

  function updateScaleMax(scaleMax: number) {
    const labels = hasLabels
      ? resizeLikertLabels(config.labels!, scaleMax - config.scaleMin + 1)
      : config.labels;
    onChange({ ...config, scaleMax, labels });
  }

  function toggleHasLabels(checked: boolean) {
    if (checked) {
      onChange({ ...config, labels: resizeLikertLabels(config.labels ?? [], pointCount) });
    } else {
      onChange({ ...config, labels: undefined });
    }
  }

  function updateLabel(index: number, value: string) {
    const labels = resizeLikertLabels(config.labels ?? [], pointCount);
    labels[index] = value;
    onChange({ ...config, labels });
  }

  return (
    <>
      <FormField label="Valor mínimo de la escala">
        <Input
          type="number"
          value={config.scaleMin}
          onChange={(e) => updateScaleMin(Number(e.target.value))}
        />
      </FormField>
      <FormField label="Valor máximo de la escala">
        <Input
          type="number"
          value={config.scaleMax}
          onChange={(e) => updateScaleMax(Number(e.target.value))}
        />
      </FormField>
      <FormField label="¿Agregar una etiqueta a cada punto?">
        <Checkbox
          checked={hasLabels}
          onChange={(e) => toggleHasLabels(e.target.checked)}
        />
      </FormField>
      {hasLabels &&
        Array.from({ length: pointCount }, (_, i) => config.scaleMin + i).map((point, i) => (
          <FormField key={point} label={`Etiqueta para el valor ${point}`}>
            <Input
              value={config.labels?.[i] ?? ""}
              onChange={(e) => updateLabel(i, e.target.value)}
            />
          </FormField>
        ))}
    </>
  );
}

function OpenTextConfigEditor({ config, onChange }: ConfigEditorProps<"open_text">) {
  return (
    <FormField label="Longitud máxima (opcional)">
      <Input
        type="number"
        value={config.maxLength ?? ""}
        onChange={(e) =>
          onChange({
            ...config,
            maxLength: e.target.value === "" ? undefined : Number(e.target.value),
          })
        }
      />
    </FormField>
  );
}

function SingleChoiceConfigEditor({ config, onChange }: ConfigEditorProps<"single_choice">) {
  return (
    <FormField label="Opciones">
      <OptionsListEditor
        options={config.options}
        onChange={(options) => onChange({ ...config, options })}
      />
    </FormField>
  );
}

function CheckboxConfigEditor({ config, onChange }: ConfigEditorProps<"checkbox">) {
  return (
    <>
      <FormField label="Opciones">
        <OptionsListEditor
          options={config.options}
          onChange={(options) => onChange({ ...config, options })}
        />
      </FormField>
      <FormField label="¿Requiere selección mínima?">
        <Checkbox
          checked={config.minSelections !== undefined}
          onChange={(e) =>
            onChange({ ...config, minSelections: e.target.checked ? 1 : undefined })
          }
        />
      </FormField>
    </>
  );
}

export const QUESTION_TYPE_REGISTRY: { [T in QuestionType]: QuestionTypeDefinition<T> } = {
  likert: {
    type: "likert",
    label: "Escala Likert",
    createDefaultConfig: () => ({ type: "likert", scaleMin: 1, scaleMax: 5 }),
    ConfigEditor: LikertConfigEditor,
  },
  open_text: {
    type: "open_text",
    label: "Texto abierto",
    createDefaultConfig: () => ({ type: "open_text" }),
    ConfigEditor: OpenTextConfigEditor,
  },
  single_choice: {
    type: "single_choice",
    label: "Opción única",
    createDefaultConfig: () => ({ type: "single_choice", options: ["", ""] }),
    ConfigEditor: SingleChoiceConfigEditor,
  },
  checkbox: {
    type: "checkbox",
    label: "Selección múltiple",
    createDefaultConfig: () => ({ type: "checkbox", options: ["", ""] }),
    ConfigEditor: CheckboxConfigEditor,
  },
};

export const QUESTION_TYPES = Object.values(QUESTION_TYPE_REGISTRY) as {
  type: QuestionType;
  label: string;
}[];
