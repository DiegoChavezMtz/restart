"use client";

import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";
import { QuestionRenderer } from "@/presentation/molecules/QuestionRenderer";
import type { Form, FormSkill, Question, QuestionSkillWeight } from "@/domain/entities";

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

const QuestionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const Footer = styled.div`
  margin-top: ${(props) => props.theme.spacing.lg};
  display: flex;
  justify-content: flex-end;
`;

export interface FormPreviewModalProps {
  open: boolean;
  onClose: () => void;
  form: Form;
  questions: Question[];
  skills: FormSkill[];
  questionSkillWeights: QuestionSkillWeight[];
}

export function FormPreviewModal({
  open,
  onClose,
  form,
  questions,
  skills,
  questionSkillWeights,
}: FormPreviewModalProps) {
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
  const weightByQuestionId = new Map(questionSkillWeights.map((w) => [w.questionId, w]));

  return (
    <Modal open={open} onClose={onClose}>
      <Header>
        <Title>{form.title}</Title>
        {form.description && <Description>{form.description}</Description>}
      </Header>
      <QuestionList>
        {questions.map((question) => {
          const weight = weightByQuestionId.get(question.id);
          const skill = weight ? skillsById.get(weight.skillId) : undefined;
          return (
            <QuestionRenderer
              key={question.id}
              question={question}
              skill={skill}
              weight={weight?.weight}
            />
          );
        })}
      </QuestionList>
      <Footer>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Footer>
    </Modal>
  );
}
