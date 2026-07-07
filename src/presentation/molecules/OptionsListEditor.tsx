"use client";

import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Row = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  align-items: center;
`;

export interface OptionsListEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

export function OptionsListEditor({ options, onChange }: OptionsListEditorProps) {
  function updateOption(index: number, value: string) {
    onChange(options.map((opt, i) => (i === index ? value : opt)));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function addOption() {
    onChange([...options, ""]);
  }

  return (
    <List>
      {options.map((option, index) => (
        <Row key={index}>
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            placeholder={`Opción ${index + 1}`}
          />
          <Button type="button" variant="secondary" onClick={() => removeOption(index)}>
            Quitar
          </Button>
        </Row>
      ))}
      <Button type="button" variant="secondary" onClick={addOption}>
        Agregar opción
      </Button>
    </List>
  );
}
