"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { CountdownTimer } from "@/presentation/molecules/CountdownTimer";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { QuestionAnswerRenderer } from "@/presentation/molecules/QuestionAnswerRenderer";
import * as soundService from "@/presentation/services/soundService";
import type { FormResponse, Question } from "@/domain/entities";
import type { AnswerValue } from "@/domain/value-objects";
import * as responseService from "@/presentation/services/responseService";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.md};
  min-height: 65vh;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
`;

const Title = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const Progress = styled.span`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.textSecondary};
`;

const QuestionSlide = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const MotionButton = motion(Button);

const SubmitButton = styled(MotionButton)`
  min-height: 44px;
  width: 100%;
`;

// Plain (non-motion) variant for the "as={Link}" case — styled-components'
// `as` prop swaps the rendered target entirely, so a motion-wrapped button
// would leak `whileTap` onto the underlying <a> as an unknown DOM prop.
const FinishButton = styled(Button)`
  min-height: 44px;
  width: 100%;
  margin-top: 150px;
`;

const slideVariants = {
  enter: { x: 48, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -48, opacity: 0 },
};

type LoadState = "loading" | "loaded" | "error";

export default function RespondFormPage() {
  const params = useParams<{ formId: string }>();
  const formId = params.formId;
  const reducedMotion = useReducedMotion();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentValue, setCurrentValue] = useState<AnswerValue | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    responseService
      .resumeFormResponse(formId)
      .then((result) => {
        setResponse(result.response);
        setQuestions(result.questions);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, [formId]);

  async function advance(
    question: Question,
    value: AnswerValue | null,
    autoSubmittedByTimeout: boolean
  ) {
    if (!response || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await responseService.submitAnswerAndAdvance(
        response.id,
        question.id,
        value,
        autoSubmittedByTimeout
      );
      setResponse(result.response);
      setCurrentValue(undefined);
      if (result.nextQuestion) {
        soundService.playAdvanceSound();
      } else {
        soundService.playCompleteSound();
      }
    } catch {
      setError("No se pudo enviar tu respuesta. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(question: Question) {
    if (currentValue === undefined) return;
    return advance(question, currentValue, false);
  }

  function handleTimeout(question: Question) {
    return advance(question, currentValue ?? null, true);
  }

  if (loadState === "loading") return null;

  if (loadState === "error" || !response) {
    return <FormStatusMessage variant="error">No se pudo cargar este formulario.</FormStatusMessage>;
  }

  if (response.status === "completed") {
    return (
      <Section>
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Title>¡Ya completaste este formulario!</Title>
          <FormStatusMessage variant="success">Gracias por tus respuestas.</FormStatusMessage>
          
        </motion.div>
        <FinishButton as={Link} href="/respond">
            Terminar
        </FinishButton>
      </Section>
    );
  }

  const currentQuestionIndex = questions.findIndex((q) => q.id === response.currentQuestionId);
  const currentQuestion = currentQuestionIndex === -1 ? undefined : questions[currentQuestionIndex];

  return (
    <Section>
      {currentQuestion && (
        <>
          <Progress>
            Pregunta {currentQuestionIndex + 1} de {questions.length}
          </Progress>
          <AnimatePresence mode="wait" initial={false}>
            <QuestionSlide
              key={currentQuestion.id}
              initial={reducedMotion ? undefined : "enter"}
              animate="center"
              exit={reducedMotion ? undefined : "exit"}
              variants={slideVariants}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {currentQuestion.timeLimitSeconds !== null && (
                <CountdownTimer
                  key={currentQuestion.id}
                  totalSeconds={currentQuestion.timeLimitSeconds}
                  onExpire={() => handleTimeout(currentQuestion)}
                />
              )}
              <QuestionAnswerRenderer
                question={currentQuestion}
                value={currentValue}
                onChange={setCurrentValue}
                disabled={isSubmitting}
              />
              {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
              <SubmitButton
                onClick={() => handleSubmit(currentQuestion)}
                disabled={isSubmitting || currentValue === undefined}
                whileTap={reducedMotion ? undefined : { scale: 0.96 }}
              >
                {isSubmitting ? "Enviando…" : "Enviar respuesta"}
              </SubmitButton>
            </QuestionSlide>
          </AnimatePresence>
        </>
      )}
    </Section>
  );
}
