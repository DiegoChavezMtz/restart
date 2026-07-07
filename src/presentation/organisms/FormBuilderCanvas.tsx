"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import styled from "styled-components";
import { DraggableQuestionRow } from "@/presentation/molecules/DraggableQuestionRow";
import type { Question } from "@/domain/entities";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

export interface FormBuilderCanvasProps {
  questions: Question[];
  onReorder: (orderedQuestionIds: string[]) => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (question: Question) => void;
  locked?: boolean;
  conflictingQuestionIds?: Set<string>;
}

export function FormBuilderCanvas({
  questions,
  onReorder,
  onEditQuestion,
  onDeleteQuestion,
  locked,
  conflictingQuestionIds,
}: FormBuilderCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(questions, oldIndex, newIndex);
    onReorder(reordered.map((q) => q.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={questions.map((q) => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <List>
          {questions.map((question) => (
            <DraggableQuestionRow
              key={question.id}
              question={question}
              onEdit={() => onEditQuestion(question)}
              onDelete={() => onDeleteQuestion(question)}
              disabled={locked}
              hasBranchConflict={conflictingQuestionIds?.has(question.id)}
            />
          ))}
        </List>
      </SortableContext>
    </DndContext>
  );
}
