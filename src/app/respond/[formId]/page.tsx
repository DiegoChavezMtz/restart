"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { CountdownTimer } from "@/presentation/molecules/CountdownTimer";
import { FormInstructionsModal } from "@/presentation/molecules/FormInstructionsModal";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { QuestionAnswerRenderer } from "@/presentation/molecules/QuestionAnswerRenderer";
import * as soundService from "@/presentation/services/soundService";
import type { Form, FormResponse, Question } from "@/domain/entities";
import type { AnswerValue } from "@/domain/value-objects";
import * as responseService from "@/presentation/services/responseService";

const Page = styled.main`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  min-height: 65vh;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 640px) {
    gap: ${(props) => props.theme.spacing.md};
  }
`;

const FormHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.lg} ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) {
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
  line-height: ${(props) => props.theme.typography.lineHeight.tight};

  @media (max-width: 640px) { font-size: ${(props) => props.theme.typography.fontSize.xl}; }
`;

const Description = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  margin-top: ${(props) => props.theme.spacing.xs};
`;

const ProgressLabel = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
`;

const ProgressTrack = styled.div`
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: ${(props) => props.theme.colors.border};
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${(props) => props.$percent}%;
  height: 100%;
  border-radius: inherit;
  background: ${(props) => props.theme.colors.primary};
  transition: width 0.25s ease;
`;

const QuestionCard = styled(motion.section)`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) {
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const AnswerFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  position: sticky;
  bottom: 0;
  padding-top: ${(props) => props.theme.spacing.md};
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) {
    padding-bottom: env(safe-area-inset-bottom);
  }
`;

const SaveHint = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  text-align: center;
`;

const SubmitButton = styled(Button)`
  width: 100%;
`;

const StartCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  justify-content: center;
  min-height: 50vh;
  padding: ${(props) => props.theme.spacing.xxl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
  text-align: center;

  @media (max-width: 640px) {
    min-height: 42vh;
    padding: ${(props) => props.theme.spacing.xl};
  }
`;

const CompletionCard = styled(motion.section)`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  justify-content: center;
  min-height: 50vh;
  padding: ${(props) => props.theme.spacing.xxl};
  border: 1px solid ${(props) => props.theme.colors.success};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
  text-align: center;
`;

const slideVariants = { enter: { x: 48, opacity: 0 }, center: { x: 0, opacity: 1 }, exit: { x: -48, opacity: 0 } };
type LoadState = "loading" | "loaded" | "error";

export default function RespondFormPage() {
  const params = useParams<{ formId: string }>();
  const formId = params.formId;
  const reducedMotion = useReducedMotion();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [currentValue, setCurrentValue] = useState<AnswerValue | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);

  useEffect(() => {
    responseService
      .resumeFormResponse(formId)
      .then((result) => {
        setResponse(result.response);
        setQuestions(result.questions);
        setForm(result.form);
        const firstQuestionId = result.questions[0]?.id ?? null;
        const isFreshStart = result.answers.length === 0 && result.response.currentQuestionId === firstQuestionId;
        const shouldShowInstructions = isFreshStart && !!result.form.instructionsPopup?.trim();
        setHasStarted(!shouldShowInstructions);
        setInstructionsModalOpen(shouldShowInstructions);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, [formId]);

  async function advance(question: Question, value: AnswerValue | null, autoSubmittedByTimeout: boolean) {
    if (!response || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await responseService.submitAnswerAndAdvance(response.id, question.id, value, autoSubmittedByTimeout);
      setResponse(result.response);
      setCurrentValue(undefined);
      if (result.nextQuestion) {
        soundService.playAdvanceSound();
      } else {
        soundService.playCompleteSound();
      }
    } catch {
      setError("No se pudo guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Preparando formulario…" />;
  if (loadState === "error" || !response || !form) return <EmptyState title="No fue posible cargar este formulario" description="Regresa a tus formularios e inténtalo de nuevo." action={<Button as={Link} href="/respond">Volver a mis formularios</Button>} />;

  if (!hasStarted) {
    return (
      <Page>
        <StartCard>
          <Title>{form.title}</Title>
          {form.description && <Description>{form.description}</Description>}
          <Button onClick={() => setInstructionsModalOpen(true)}>Ver instrucciones y comenzar</Button>
        </StartCard>
        <FormInstructionsModal open={instructionsModalOpen} onClose={() => setInstructionsModalOpen(false)} title={form.title} instructions={form.instructionsPopup ?? ""} onStart={() => { setInstructionsModalOpen(false); setHasStarted(true); }} />
      </Page>
    );
  }

  if (response.status === "completed") {
    return (
      <Page>
        <CompletionCard initial={reducedMotion ? undefined : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}>
          <Title>¡Formulario completado!</Title>
          <Description>Gracias por compartir tus respuestas. Ya quedaron registradas.</Description>
          <Button as={Link} href="/respond">Volver a mis formularios</Button>
        </CompletionCard>
      </Page>
    );
  }

  const currentQuestionIndex = questions.findIndex((q) => q.id === response.currentQuestionId);
  const currentQuestion = currentQuestionIndex === -1 ? undefined : questions[currentQuestionIndex];
  const progressPercent = currentQuestion ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <Page>
      <FormHeader>
        <Title>{form.title}</Title>
        <ProgressRow><ProgressLabel>Pregunta {currentQuestionIndex + 1} de {questions.length}</ProgressLabel><ProgressLabel>{Math.round(progressPercent)}%</ProgressLabel></ProgressRow>
        <ProgressTrack role="progressbar" aria-label="Progreso del formulario" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={currentQuestionIndex + 1}><ProgressFill $percent={progressPercent} /></ProgressTrack>
      </FormHeader>
      {currentQuestion && (
        <AnimatePresence mode="wait" initial={false}>
          <QuestionCard key={currentQuestion.id} initial={reducedMotion ? undefined : "enter"} animate="center" exit={reducedMotion ? undefined : "exit"} variants={slideVariants} transition={{ duration: 0.22, ease: "easeOut" }} aria-live="polite">
            {currentQuestion.timeLimitSeconds !== null && <CountdownTimer key={currentQuestion.id} totalSeconds={currentQuestion.timeLimitSeconds} onExpire={() => advance(currentQuestion, currentValue ?? null, true)} />}
            <QuestionAnswerRenderer question={currentQuestion} value={currentValue} onChange={setCurrentValue} disabled={isSubmitting} />
            {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
            <AnswerFooter>
              <SaveHint>{isSubmitting ? "Guardando tu respuesta…" : "Tu respuesta se guarda al continuar."}</SaveHint>
              <SubmitButton onClick={() => currentValue !== undefined && advance(currentQuestion, currentValue, false)} disabled={isSubmitting || currentValue === undefined}>
                {isSubmitting ? "Guardando…" : "Continuar"}
              </SubmitButton>
            </AnswerFooter>
          </QuestionCard>
        </AnimatePresence>
      )}
    </Page>
  );
}
