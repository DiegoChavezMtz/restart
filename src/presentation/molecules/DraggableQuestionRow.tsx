"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { QUESTION_TYPE_REGISTRY } from "@/presentation/registries/questionTypeRegistry";
import type { Question } from "@/domain/entities";

const Row = styled.div<{ $isDragging: boolean }>`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.sm};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 12px;
  background: ${(props) => props.theme.colors.background};
  opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};

  @media (max-width: 640px) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
`;

const DragHandle = styled.button`
  cursor: grab;
  border: none;
  background: transparent;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  padding: ${(props) => props.theme.spacing.xs};

  &:active {
    cursor: grabbing;
  }
`;

const QuestionLabel = styled.span`
  flex: 1;
  min-width: 180px;
  color: ${(props) => props.theme.colors.textPrimary};
`;

const Actions = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.xs};

  @media (max-width: 640px) {
    width: 100%;
  }
`;

export interface DraggableQuestionRowProps {
  question: Question;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  hasBranchConflict?: boolean;
}

export function DraggableQuestionRow({
  question,
  onEdit,
  onDelete,
  disabled,
  hasBranchConflict,
}: DraggableQuestionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Row ref={setNodeRef} style={style} $isDragging={isDragging}>
      <DragHandle type="button" disabled={disabled} aria-label={`Reordenar pregunta: ${question.label}`} {...attributes} {...listeners}>
        ⠿
      </DragHandle>
      <QuestionLabel>{question.label}</QuestionLabel>
      <Badge>{QUESTION_TYPE_REGISTRY[question.type].label}</Badge>
      {hasBranchConflict && (
        <Badge tone="warning">Conflicto de salto</Badge>
      )}
      {!disabled && (
        <Actions>
          <Button type="button" variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button type="button" variant="secondary" onClick={onDelete}>
            Borrar
          </Button>
        </Actions>
      )}
    </Row>
  );
}
