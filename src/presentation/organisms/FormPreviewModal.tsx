"use client";

import { useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";
import { QuestionAnswerRenderer } from "@/presentation/molecules/QuestionAnswerRenderer";
import { resolveNextQuestionId } from "@/application/use-cases/responses/ResolveNextQuestion";
import type {
  Form,
  FormSkill,
  Question,
  QuestionOptionBranch,
  QuestionSkillWeight,
} from "@/domain/entities";
import type { AnswerValue } from "@/domain/value-objects";

const Header = styled.div`
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Description = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
`;

const QuestionBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Footer = styled.div`
  margin-top: ${(props) => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Progress = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const Actions = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
`;

export interface FormPreviewModalProps {
  open: boolean;
  onClose: () => void;
  form: Form;
  questions: Question[];
  skills: FormSkill[];
  questionSkillWeights: QuestionSkillWeight[];
  branches: QuestionOptionBranch[];
}

export function FormPreviewModal({
  open,
  onClose,
  form,
  questions,
  skills,
  questionSkillWeights,
  branches,
}: FormPreviewModalProps) {
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [value, setValue] = useState<AnswerValue | undefined>(undefined);
  const [finished, setFinished] = useState(false);

  // Reinicia la simulación cada vez que el modal pasa de cerrado a abierto,
  // para que siempre empiece desde la primera pregunta. Ajuste de estado
  // durante el render (patrón recomendado por React para "resetear estado
  // cuando cambia una prop"), no un efecto — evita el round-trip de un
  // render extra que produciría un useEffect equivalente.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCurrentQuestionId(questions[0]?.id ?? null);
      setValue(undefined);
      setFinished(false);
    }
  }

  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
  const weightByQuestionId = new Map(questionSkillWeights.map((w) => [w.questionId, w]));
  const currentQuestion = questions.find((q) => q.id === currentQuestionId) ?? null;
  const currentIndex = currentQuestion
    ? questions.findIndex((q) => q.id === currentQuestion.id)
    : questions.length;

  function handleNext() {
    if (!currentQuestion) return;
    const resolved = resolveNextQuestionId(questions, branches, currentQuestion.id, value ?? null);
    setValue(undefined);
    if (resolved === "end_form") {
      setCurrentQuestionId(null);
      setFinished(true);
    } else {
      setCurrentQuestionId(resolved);
    }
  }

  const weight = currentQuestion ? weightByQuestionId.get(currentQuestion.id) : undefined;
  const skill = weight ? skillsById.get(weight.skillId) : undefined;

  return (
    <Modal open={open} onClose={onClose}>
      <Header>
        <Title>{form.title}</Title>
        {form.description && <Description>{form.description}</Description>}
      </Header>

      {currentQuestion ? (
        <QuestionBlock>
          {skill && (
            <Badge>
              {skill.name}
              {weight ? ` · ${weight.weight}` : ""}
            </Badge>
          )}
          <QuestionAnswerRenderer question={currentQuestion} value={value} onChange={setValue} />
        </QuestionBlock>
      ) : (
        <Description>
          {finished ? "Fin del formulario (vista previa)." : "Este formulario no tiene preguntas."}
        </Description>
      )}

      <Footer>
        <Progress>
          Pregunta {Math.min(currentIndex + 1, questions.length)} de {questions.length}
        </Progress>
        <Actions>
          {currentQuestion && (
            <Button onClick={handleNext} disabled={value === undefined}>
              Siguiente
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </Actions>
      </Footer>
    </Modal>
  );
}
