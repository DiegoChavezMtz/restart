"use client";

import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormField } from "@/presentation/molecules/FormField";
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
  border-radius: 10px;
  background: ${(props) => props.theme.colors.background};

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  align-items: end;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;

    > button {
      width: 100%;
    }
  }
`;

const EmptyText = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

export interface FormSkillsPanelProps {
  skills: FormSkill[];
  locked: boolean;
  onCreate: (input: { name: string; description: string | null }) => Promise<void>;
  onUpdate: (skillId: string, input: { name: string; description: string | null }) => Promise<void>;
  onDelete: (skillId: string) => Promise<void>;
}

export function FormSkillsPanel({ skills, locked, onCreate, onUpdate, onDelete }: FormSkillsPanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

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

  async function handleUpdate(skillId: string) {
    if (!editingName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdate(skillId, { name: editingName, description: editingDescription || null });
      setEditingSkillId(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <List>
      {skills.length === 0 && <EmptyText>No hay habilidades creadas aún.</EmptyText>}
      {skills.map((skill) => (
        <SkillRow key={skill.id}>
          {editingSkillId === skill.id ? (
            <>
              <Input aria-label="Nombre de habilidad" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
              <Input aria-label="Descripción de habilidad" value={editingDescription} onChange={(e) => setEditingDescription(e.target.value)} />
            </>
          ) : (
            <>
              <SkillName>{skill.name}</SkillName>
              {skill.description && <SkillDescription>{skill.description}</SkillDescription>}
            </>
          )}
          {!locked && (
            editingSkillId === skill.id ? (
              <>
                <Button type="button" onClick={() => handleUpdate(skill.id)} disabled={isSubmitting || !editingName.trim()}>Guardar</Button>
                <Button type="button" variant="secondary" onClick={() => setEditingSkillId(null)} disabled={isSubmitting}>Cancelar</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={() => {
                  setEditingSkillId(skill.id);
                  setEditingName(skill.name);
                  setEditingDescription(skill.description ?? "");
                }}>Editar</Button>
                <Button type="button" variant="secondary" onClick={() => onDelete(skill.id)}>Borrar</Button>
              </>
            )
          )}
        </SkillRow>
      ))}
      {!locked && (
        <CreateForm onSubmit={handleSubmit}>
          <FormField label="Nombre" htmlFor="skill-name"><Input id="skill-name" value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
          <FormField label="Descripción (opcional)" htmlFor="skill-description"><Input id="skill-description" value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Agregando…" : "Agregar habilidad"}
          </Button>
        </CreateForm>
      )}
    </List>
  );
}
