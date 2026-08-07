"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { Switch } from "@/presentation/atoms/Switch";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { ConfirmActionDialog } from "@/presentation/molecules/ConfirmActionDialog";
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
  QuestionOptionBranch,
  QuestionSkillWeight,
  User,
} from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import * as formService from "@/presentation/services/formService";
import Link from "next/link";

const Builder = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 1120px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};

  &:hover {
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const BuilderHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.lg};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 720px) {
    flex-direction: column;
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const BuilderTitleGroup = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const FormTitle = styled.h2`
  overflow: hidden;
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Meta = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

const BuilderNav = styled.nav`
  display: flex;
  gap: ${(props) => props.theme.spacing.xs};
  overflow-x: auto;
  padding: ${(props) => props.theme.spacing.xs};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 12px;
  background: ${(props) => props.theme.colors.background};
`;

const BuilderTab = styled.button<{ $active: boolean }>`
  min-height: 40px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border: 0;
  border-radius: 8px;
  background: ${(props) => (props.$active ? props.theme.colors.surfaceElevated : "transparent")};
  color: ${(props) => (props.$active ? props.theme.colors.textPrimary : props.theme.colors.textSecondary)};
  cursor: pointer;
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => (props.$active ? props.theme.typography.fontWeight.bold : props.theme.typography.fontWeight.medium)};
  white-space: nowrap;

  &:hover {
    background: ${(props) => props.theme.colors.surfaceHover};
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const Panel = styled.section`
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

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const SectionTitle = styled.h3`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const PanelDescription = styled.p`
  max-width: 64ch;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const SwitchRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 10px;
  background: ${(props) => props.theme.colors.background};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  font-family: inherit;
  font-size: ${(props) => props.theme.typography.fontSize.md};
  resize: vertical;

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }
`;

const HelperText = styled.p`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.textSecondary};
`;

const STATUS_TONE: Record<FormStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  closed: "warning",
  archived: "neutral",
};

const STATUS_LABEL: Record<FormStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  closed: "Cerrado",
  archived: "Archivado",
};

type LoadState = "loading" | "loaded" | "not_found" | "error";
type BuilderSection = "settings" | "audience" | "skills" | "questions";
type Confirmation = "delete_question" | "delete_skill" | "archive" | "restore";

const BUILDER_SECTIONS: { id: BuilderSection; label: string }[] = [
  { id: "settings", label: "Configuración" },
  { id: "audience", label: "Audiencia" },
  { id: "skills", label: "Habilidades" },
  { id: "questions", label: "Preguntas" },
];

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
  const [branches, setBranches] = useState<QuestionOptionBranch[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [browsedCohortId, setBrowsedCohortId] = useState("");
  const [browsedParticipants, setBrowsedParticipants] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [activeSection, setActiveSection] = useState<BuilderSection>("settings");
  const [confirmation, setConfirmation] = useState<{ type: Confirmation; id?: string } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructionsPopup, setInstructionsPopup] = useState("");

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
        setBranches(result.questionOptionBranches);
        setTitle(result.form.title);
        setDescription(result.form.description ?? "");
        setInstructionsPopup(result.form.instructionsPopup ?? "");
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
    setNotice(null);
    try {
      const saved = await formService.setFormAssignments(formId, targets);
      setAssignments(saved);
      setNotice("La audiencia del formulario se actualizó.");
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

  // Un salto queda en conflicto si su destino ya no tiene un `order` mayor al
  // de la pregunta origen (por ejemplo, tras un reordenamiento por drag & drop)
  // o si la pregunta destino ya no existe.
  const questionOrderById = new Map(questions.map((q) => [q.id, q.order]));
  const conflictingQuestionIds = new Set(
    branches
      .filter((branch) => {
        if (branch.endsForm) return false;
        const sourceOrder = questionOrderById.get(branch.questionId);
        const targetOrder = branch.targetQuestionId
          ? questionOrderById.get(branch.targetQuestionId)
          : undefined;
        return (
          sourceOrder === undefined || targetOrder === undefined || targetOrder <= sourceOrder
        );
      })
      .map((branch) => branch.questionId)
  );

  async function handleSaveDetails() {
    if (!form) return;
    setNotice(null);
    try {
      const updated = await formService.updateFormDetails(formId, {
        title,
        description: description || null,
        instructionsPopup: instructionsPopup.trim() || null,
      });
      setForm(updated);
      setNotice("La configuración se guardó.");
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
    setNotice(null);
    try {
      setForm(await formService.setFormStatus(formId, "published"));
      setNotice("El formulario se publicó y ya puede compartirse con la audiencia asignada.");
    } catch {
      setError("No se pudo publicar el formulario.");
    }
  }

  async function handleClose() {
    if (!form) return;
    setNotice(null);
    try {
      setForm(await formService.setFormStatus(formId, "closed"));
      setNotice("El formulario se cerró para nuevas respuestas.");
    } catch {
      setError("No se pudo cerrar el formulario.");
    }
  }

  async function handleSetArchived(archived: boolean) {
    try {
      const updated = await formService.setFormArchived(formId, archived);
      setForm(updated);
      setNotice(archived ? "El formulario se archivó. Su historial se conserva." : "El formulario se restauró como cerrado.");
    } catch {
      setError(archived ? "No se pudo archivar el formulario." : "No se pudo restaurar el formulario.");
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
    const { skillWeight, branches: branchInput, ...questionInput } = input;
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

      if (branchInput !== undefined) {
        const saved = await formService.setQuestionOptionBranches(formId, questionId, branchInput);
        setBranches((prev) => [...prev.filter((b) => b.questionId !== questionId), ...saved]);
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

  async function handleUpdateSkill(skillId: string, input: { name: string; description: string | null }) {
    try {
      const updated = await formService.updateFormSkill(formId, skillId, input);
      setSkills((prev) => prev.map((skill) => (skill.id === skillId ? updated : skill)));
      setNotice("La habilidad se actualizó.");
    } catch {
      setError("No se pudo actualizar la habilidad.");
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

  async function handleConfirm() {
    if (!confirmation) return;
    setIsConfirming(true);
    try {
      if (confirmation.type === "delete_question" && confirmation.id) {
        const question = questions.find((item) => item.id === confirmation.id);
        if (question) await handleDeleteQuestion(question);
      }
      if (confirmation.type === "delete_skill" && confirmation.id) await handleDeleteSkill(confirmation.id);
      if (confirmation.type === "archive") await handleSetArchived(true);
      if (confirmation.type === "restore") await handleSetArchived(false);
      setConfirmation(null);
    } finally {
      setIsConfirming(false);
    }
  }

  if (loadState === "loading") return <LoadingState label="Cargando constructor…" />;

  if (loadState === "not_found") {
    return <EmptyState title="Este formulario no existe" description="Regresa a la lista para elegir un formulario disponible." action={<Button as={Link} href="/admin/forms">Volver a formularios</Button>} />;
  }

  if (loadState === "error" || !form) {
    return <EmptyState title="No fue posible cargar el formulario" description="Actualiza la página para volver a intentarlo." action={<Button as={Link} href="/admin/forms" variant="secondary">Volver a formularios</Button>} />;
  }

  return (
    <Builder>
      <BackLink href="/admin/forms">← Todos los formularios</BackLink>
      <BuilderHeader>
        <BuilderTitleGroup>
          <div><Badge tone={STATUS_TONE[form.status]}>{STATUS_LABEL[form.status]}</Badge></div>
          <FormTitle>{form.title}</FormTitle>
          <Meta>{questions.length} {questions.length === 1 ? "pregunta" : "preguntas"} · {assignments.length} {assignments.length === 1 ? "asignación" : "asignaciones"}</Meta>
        </BuilderTitleGroup>
        <HeaderActions>
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>Vista previa</Button>
          {form.status === "draft" && <Button onClick={handlePublish} disabled={questions.length === 0}>Publicar</Button>}
          {form.status === "published" && <Button variant="destructive" onClick={handleClose}>Cerrar formulario</Button>}
          {(form.status === "draft" || form.status === "closed") && <Button variant="secondary" onClick={() => setConfirmation({ type: "archive" })}>Archivar</Button>}
          {form.status === "archived" && <Button variant="secondary" onClick={() => setConfirmation({ type: "restore" })}>Restaurar</Button>}
        </HeaderActions>
      </BuilderHeader>

      {form.status === "draft" && questions.length === 0 && (
        <FormStatusMessage variant="error" role="status">Agrega al menos una pregunta antes de publicar este formulario.</FormStatusMessage>
      )}
      {locked && (
        <FormStatusMessage variant="error" role="status">
          Este formulario ya tiene respuestas. Su estructura está protegida; puedes duplicarlo para crear una nueva versión.
          <br />
          <Button onClick={handleDuplicate} disabled={isDuplicating}>{isDuplicating ? "Duplicando…" : "Duplicar formulario"}</Button>
        </FormStatusMessage>
      )}
      {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
      {notice && <FormStatusMessage variant="success" role="status">{notice}</FormStatusMessage>}

      <BuilderNav role="tablist" aria-label="Áreas del constructor">
        {BUILDER_SECTIONS.map((section) => (
          <BuilderTab
            key={section.id}
            type="button"
            role="tab"
            id={`builder-tab-${section.id}`}
            aria-selected={activeSection === section.id}
            aria-controls={`builder-panel-${section.id}`}
            $active={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}{section.id === "questions" ? ` (${questions.length})` : section.id === "skills" ? ` (${skills.length})` : ""}
          </BuilderTab>
        ))}
      </BuilderNav>

      {activeSection === "settings" && (
        <Panel role="tabpanel" id="builder-panel-settings" aria-labelledby="builder-tab-settings">
          <PanelHeader><div><SectionTitle>Configuración</SectionTitle><PanelDescription>Define la información que verán los participantes y cómo podrán responder.</PanelDescription></div></PanelHeader>
          <FormField label="Título" htmlFor="builder-title"><Input id="builder-title" value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          <FormField label="Descripción" htmlFor="builder-description"><Input id="builder-description" value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
          <FormField label="Instrucciones (popup opcional)" htmlFor="builder-instructions">
            <TextArea id="builder-instructions" value={instructionsPopup} onChange={(e) => setInstructionsPopup(e.target.value)} />
            <HelperText>Déjalo vacío si no necesitas mostrar instrucciones antes de iniciar.</HelperText>
          </FormField>
          <SwitchRow><Switch checked={form.acceptingResponses} onChange={handleToggleAcceptingResponses} /> Aceptar respuestas ahora</SwitchRow>
          <SwitchRow><Checkbox checked={form.allowsPartialSave} onChange={(e) => handleToggleAllowsPartialSave(e.target.checked)} /> Permitir guardar y continuar después</SwitchRow>
          <Button onClick={handleSaveDetails}>Guardar configuración</Button>
        </Panel>
      )}

      {activeSection === "audience" && (
        <Panel role="tabpanel" id="builder-panel-audience" aria-labelledby="builder-tab-audience">
          <PanelHeader><div><SectionTitle>Audiencia</SectionTitle><PanelDescription>Asigna el formulario a cohortes completas o selecciona participantes específicos.</PanelDescription></div><Badge>{assignments.length} asignadas</Badge></PanelHeader>
          <FormAssignmentsPanel cohorts={cohorts} assignments={assignments} browsedCohortId={browsedCohortId} onBrowseCohortChange={handleBrowseCohortChange} browsedParticipants={browsedParticipants} onSave={handleSaveAssignments} />
        </Panel>
      )}

      {activeSection === "skills" && (
        <Panel role="tabpanel" id="builder-panel-skills" aria-labelledby="builder-tab-skills">
          <PanelHeader><div><SectionTitle>Habilidades</SectionTitle><PanelDescription>Úsalas para relacionar preguntas Likert con las métricas que quieres analizar.</PanelDescription></div><Badge>{skills.length} creadas</Badge></PanelHeader>
          <FormSkillsPanel skills={skills} locked={locked} onCreate={handleCreateSkill} onUpdate={handleUpdateSkill} onDelete={async (skillId) => { setConfirmation({ type: "delete_skill", id: skillId }); }} />
        </Panel>
      )}

      {activeSection === "questions" && (
        <Panel role="tabpanel" id="builder-panel-questions" aria-labelledby="builder-tab-questions">
          <PanelHeader><div><SectionTitle>Preguntas</SectionTitle><PanelDescription>{locked ? "Las preguntas no pueden cambiar porque el formulario ya tiene respuestas." : "Arrastra las preguntas para cambiar el orden. Puedes editar su tipo, reglas y tiempo límite."}</PanelDescription></div>{!locked && <Button onClick={() => setEditorState({ mode: "create" })}>Agregar pregunta</Button>}</PanelHeader>
          {questions.length === 0 ? <EmptyState title="Todavía no hay preguntas" description="Agrega la primera pregunta para comenzar a construir esta evaluación." action={!locked ? <Button onClick={() => setEditorState({ mode: "create" })}>Agregar pregunta</Button> : undefined} /> : <FormBuilderCanvas questions={questions} onReorder={handleReorder} onEditQuestion={(question) => setEditorState({ mode: "edit", question })} onDeleteQuestion={(question) => setConfirmation({ type: "delete_question", id: question.id })} locked={locked} conflictingQuestionIds={conflictingQuestionIds} />}
        </Panel>
      )}

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
          allQuestions={questions}
          existingBranches={
            editorState.mode === "edit"
              ? branches.filter((b) => b.questionId === editorState.question.id)
              : undefined
          }
          onSave={handleSaveQuestion}
          onCancel={() => setEditorState(null)}
          onDelete={
            editorState.mode === "edit"
              ? () => setConfirmation({ type: "delete_question", id: editorState.question.id })
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
        branches={branches}
      />
      <ConfirmActionDialog
        open={confirmation !== null}
        title={confirmation?.type === "delete_question" ? "¿Borrar pregunta?" : confirmation?.type === "delete_skill" ? "¿Borrar habilidad?" : confirmation?.type === "archive" ? "¿Archivar formulario?" : "¿Restaurar formulario?"}
        description={confirmation?.type === "delete_question" ? "Esta acción elimina la pregunta y sus configuraciones asociadas." : confirmation?.type === "delete_skill" ? "Esta acción elimina la habilidad y sus pesos asociados." : confirmation?.type === "archive" ? "El formulario dejará de estar disponible para participantes, pero su historial se conservará." : "El formulario volverá como cerrado; podrás revisarlo antes de volver a publicarlo."}
        confirmLabel={confirmation?.type === "restore" ? "Restaurar" : confirmation?.type === "archive" ? "Archivar" : "Borrar"}
        destructive={confirmation?.type !== "restore"}
        isConfirming={isConfirming}
        onConfirm={handleConfirm}
        onClose={() => !isConfirming && setConfirmation(null)}
      />
    </Builder>
  );
}
