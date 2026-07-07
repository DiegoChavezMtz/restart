"use client";

import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import type { FormSkill } from "@/domain/entities";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const SkillRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.sm};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
`;

const SkillName = styled.span`
  flex: 1;
  color: ${(props) => props.theme.colors.textPrimary};
`;

const SkillDescription = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const CreateForm = styled.form`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
`;

export interface FormSkillsPanelProps {
  skills: FormSkill[];
  locked: boolean;
  onCreate: (input: { name: string; description: string | null }) => Promise<void>;
  onDelete: (skillId: string) => Promise<void>;
}

export function FormSkillsPanel({ skills, locked, onCreate, onDelete }: FormSkillsPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreate({ name, description: description || null });
      setName("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <List>
      {skills.map((skill) => (
        <SkillRow key={skill.id}>
          <SkillName>{skill.name}</SkillName>
          {skill.description && <SkillDescription>{skill.description}</SkillDescription>}
          {!locked && (
            <Button type="button" variant="secondary" onClick={() => onDelete(skill.id)}>
              Borrar
            </Button>
          )}
        </SkillRow>
      ))}
      {!locked && (
        <CreateForm onSubmit={handleSubmit}>
          <Input
            placeholder="Nombre de la habilidad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Agregando…" : "Agregar habilidad"}
          </Button>
        </CreateForm>
      )}
    </List>
  );
}
