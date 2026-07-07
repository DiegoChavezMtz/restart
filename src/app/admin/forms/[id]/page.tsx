"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { Switch } from "@/presentation/atoms/Switch";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { FormAssignmentsPanel } from "@/presentation/organisms/FormAssignmentsPanel";
import { FormBuilderCanvas } from "@/presentation/organisms/FormBuilderCanvas";
import { FormPreviewModal } from "@/presentation/organisms/FormPreviewModal";
import { FormSkillsPanel } from "@/presentation/organisms/FormSkillsPanel";
import { QuestionEditorPanel, type QuestionEditorPanelInput } from "@/presentation/organisms/QuestionEditorPanel";
import type {
  Cohort,
  Form,
  FormAssignment,
  FormAssignmentTargetType,
  FormSkill,
  FormStatus,
  Question,
  QuestionSkillWeight,
  User,
} from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import * as formService from "@/presentation/services/formService";
import Link from "next/link";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 720px;
  margin-bottom: ${(props) => props.theme.spacing.xxl};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
`;

const SectionTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const SwitchRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const STATUS_TONE: Record<FormStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  closed: "warning",
};

const STATUS_LABEL: Record<FormStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  closed: "Cerrado",
};

type LoadState = "loading" | "loaded" | "not_found" | "error";

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const formId = params.id;

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [form, setForm] = useState<Form | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [skills, setSkills] = useState<FormSkill[]>([]);
  const [questionSkillWeights, setQuestionSkillWeights] = useState<QuestionSkillWeight[]>([]);
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [browsedCohortId, setBrowsedCohortId] = useState("");
  const [browsedParticipants, setBrowsedParticipants] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [editorState, setEditorState] = useState<
    { mode: "create" } | { mode: "edit"; question: Question } | null
  >(null);

  useEffect(() => {
    formService
      .getForm(formId)
      .then((result) => {
        setForm(result.form);
        setQuestions(result.questions);
        setResponseCount(result.responseCount);
        setSkills(result.skills);
        setQuestionSkillWeights(result.questionSkillWeights);
        setAssignments(result.assignments);
        setTitle(result.form.title);
        setDescription(result.form.description ?? "");
        setLoadState("loaded");
      })
      .catch((err) => {
        setLoadState(err?.response?.status === 404 ? "not_found" : "error");
      });
    cohortService.listCohorts().then(setCohorts).catch(() => setError("No se pudieron cargar las cohortes."));
  }, [formId]);

  async function handleBrowseCohortChange(cohortId: string) {
    setBrowsedCohortId(cohortId);
    if (!cohortId) {
      setBrowsedParticipants([]);
      return;
    }
    try {
      const detail = await cohortService.getCohortDetail(cohortId);
      setBrowsedParticipants(detail.participants);
    } catch {
      setError("No se pudieron cargar los participantes de la cohorte.");
    }
  }

  async function handleSaveAssignments(
    targets: { targetType: FormAssignmentTargetType; targetId: string }[]
  ) {
    try {
      const saved = await formService.setFormAssignments(formId, targets);
      setAssignments(saved);
    } catch {
      setError("No se pudieron guardar las asignaciones.");
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const duplicated = await formService.duplicateForm(formId);
      router.push(`/admin/forms/${duplicated.id}`);
    } catch {
      setError("No se pudo duplicar el formulario.");
      setIsDuplicating(false);
    }
  }

  const locked = responseCount > 0;

  async function handleSaveDetails() {
    if (!form) return;
    try {
      const updated = await formService.updateFormDetails(formId, {
        title,
        description: description || null,
      });
      setForm(updated);
    } catch {
      setError("No se pudieron guardar los cambios.");
    }
  }

  async function handleToggleAcceptingResponses(checked: boolean) {
    if (!form) return;
    const updated = await formService.setAcceptingResponses(formId, checked);
    setForm(updated);
  }

  async function handleToggleAllowsPartialSave(checked: boolean) {
    if (!form) return;
    const updated = await formService.updateFormDetails(formId, { allowsPartialSave: checked });
    setForm(updated);
  }

  async function handlePublish() {
    if (!form) return;
    try {
      setForm(await formService.setFormStatus(formId, "published"));
    } catch {
      setError("No se pudo publicar el formulario.");
    }
  }

  async function handleClose() {
    if (!form) return;
    try {
      setForm(await formService.setFormStatus(formId, "closed"));
    } catch {
      setError("No se pudo cerrar el formulario.");
    }
  }

  async function handleReorder(orderedQuestionIds: string[]) {
    const previous = questions;
    const reordered = orderedQuestionIds
      .map((id) => questions.find((q) => q.id === id))
      .filter((q): q is Question => q !== undefined);
    setQuestions(reordered);
    try {
      const persisted = await formService.reorderQuestions(formId, orderedQuestionIds);
      setQuestions(persisted);
    } catch {
      setQuestions(previous);
      setError("No se pudo reordenar las preguntas.");
    }
  }

  async function handleSaveQuestion(input: QuestionEditorPanelInput) {
    const { skillWeight, ...questionInput } = input;
    try {
      let questionId: string;
      if (editorState?.mode === "edit") {
        const updated = await formService.updateQuestion(formId, editorState.question.id, questionInput);
        setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
        questionId = updated.id;
      } else {
        const created = await formService.addQuestion(formId, questionInput);
        setQuestions((prev) => [...prev, created]);
        questionId = created.id;
      }

      if (skillWeight === null) {
        await formService.clearQuestionSkillWeight(formId, questionId);
        setQuestionSkillWeights((prev) => prev.filter((w) => w.questionId !== questionId));
      } else if (skillWeight !== undefined) {
        const saved = await formService.setQuestionSkillWeight(formId, questionId, skillWeight);
        setQuestionSkillWeights((prev) => [
          ...prev.filter((w) => w.questionId !== questionId),
          saved,
        ]);
      }

      setEditorState(null);
    } catch {
      setError("No se pudo guardar la pregunta.");
    }
  }

  async function handleDeleteQuestion(question: Question) {
    try {
      await formService.deleteQuestion(formId, question.id);
      setQuestions((prev) => prev.filter((q) => q.id !== question.id));
      setQuestionSkillWeights((prev) => prev.filter((w) => w.questionId !== question.id));
      setEditorState(null);
    } catch {
      setError("No se pudo borrar la pregunta.");
    }
  }

  async function handleCreateSkill(input: { name: string; description: string | null }) {
    try {
      const skill = await formService.createFormSkill(formId, input);
      setSkills((prev) => [...prev, skill]);
    } catch {
      setError("No se pudo crear la habilidad.");
    }
  }

  async function handleDeleteSkill(skillId: string) {
    try {
      await formService.deleteFormSkill(formId, skillId);
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
      setQuestionSkillWeights((prev) => prev.filter((w) => w.skillId !== skillId));
    } catch {
      setError("No se pudo borrar la habilidad.");
    }
  }

  if (loadState === "loading") return null;

  if (loadState === "not_found") {
    return <FormStatusMessage variant="error">Este formulario no existe.</FormStatusMessage>;
  }

  if (loadState === "error" || !form) {
    return <FormStatusMessage variant="error">No se pudo cargar el formulario.</FormStatusMessage>;
  }

  return (
    <>
      <Section>
        <Button as={Link} href={`/admin/forms`} variant="secondary">{"<- Regresar"} </Button>
        <HeaderRow>
          <SectionTitle>Detalles</SectionTitle>
          <Badge tone={STATUS_TONE[form.status]}>{STATUS_LABEL[form.status]}</Badge>
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            Vista previa
          </Button>
        </HeaderRow>

        <FormField label="Título">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <FormField label="Descripción">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <Button onClick={handleSaveDetails}>Guardar detalles</Button>

        <SwitchRow>
          <Switch checked={form.acceptingResponses} onChange={handleToggleAcceptingResponses} />
          Aceptando respuestas
        </SwitchRow>

        <SwitchRow>
          <Checkbox
            checked={form.allowsPartialSave}
            onChange={(e) => handleToggleAllowsPartialSave(e.target.checked)}
          />
          Permite guardado parcial
        </SwitchRow>

        <HeaderRow>
          {form.status === "draft" && <Button onClick={handlePublish}>Publicar</Button>}
          {form.status === "published" && <Button onClick={handleClose}>Cerrar</Button>}
        </HeaderRow>

        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
      </Section>

      <Section>
        <SectionTitle>Asignación</SectionTitle>
        <FormAssignmentsPanel
          cohorts={cohorts}
          assignments={assignments}
          browsedCohortId={browsedCohortId}
          onBrowseCohortChange={handleBrowseCohortChange}
          browsedParticipants={browsedParticipants}
          onSave={handleSaveAssignments}
        />
      </Section>

      {locked && (
        <Section>
          <FormStatusMessage variant="error">
            Este formulario ya tiene respuestas y no se puede editar su estructura.
          </FormStatusMessage>
          <Button onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? "Duplicando…" : "Duplicar formulario"}
          </Button>
        </Section>
      )}

      <Section>
        <SectionTitle>Habilidades</SectionTitle>
        <FormSkillsPanel
          skills={skills}
          locked={locked}
          onCreate={handleCreateSkill}
          onDelete={handleDeleteSkill}
        />
      </Section>

      <Section>
        <HeaderRow>
          <SectionTitle>Preguntas</SectionTitle>
          {!locked && (
            <Button onClick={() => setEditorState({ mode: "create" })}>Agregar pregunta</Button>
          )}
        </HeaderRow>
        <FormBuilderCanvas
          questions={questions}
          onReorder={handleReorder}
          onEditQuestion={(question) => setEditorState({ mode: "edit", question })}
          onDeleteQuestion={handleDeleteQuestion}
          locked={locked}
        />
      </Section>

      {editorState && (
        <QuestionEditorPanel
          mode={editorState.mode}
          question={editorState.mode === "edit" ? editorState.question : undefined}
          skills={skills}
          currentSkillWeight={
            editorState.mode === "edit"
              ? questionSkillWeights.find((w) => w.questionId === editorState.question.id)
              : undefined
          }
          onSave={handleSaveQuestion}
          onCancel={() => setEditorState(null)}
          onDelete={
            editorState.mode === "edit"
              ? () => handleDeleteQuestion(editorState.question)
              : undefined
          }
        />
      )}

      <FormPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        form={form}
        questions={questions}
        skills={skills}
        questionSkillWeights={questionSkillWeights}
      />
    </>
  );
}
