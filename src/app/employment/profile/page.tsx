"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Input } from "@/presentation/atoms/Input";
import { Modal } from "@/presentation/atoms/Modal";
import { Select } from "@/presentation/atoms/Select";
import { FormField } from "@/presentation/molecules/FormField";
import { MonthField } from "@/presentation/molecules/DatePicker";
import type { EducationEntry, ExperienceEntry, ProfileItemOrigin, SkillCategory, SkillItem } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import { ConfirmActionDialog } from "@/presentation/molecules/ConfirmActionDialog";
import { addEducationEntry, addExperienceEntry, addSkillItem, deleteEducationEntry, deleteExperienceEntry, deleteSkillItem, getEmploymentProfile } from "@/presentation/services/employmentProfileService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 880px;
`;

const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 480px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const SectionTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.lg};
  border-radius: 14px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
`;

const RoleLine = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const OrgLine = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const DateRange = styled.span`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  white-space: nowrap;
`;

const Description = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const EmptyState = styled.div`
  padding: ${(props) => props.theme.spacing.lg};
  border: 1px dashed ${(props) => props.theme.colors.borderStrong};
  border-radius: 14px;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 112px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 10px;
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};
  font: inherit;
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
  resize: vertical;

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }
`;

const SkillGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

const SkillChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: 999px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const ModalTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: ${(props) => props.theme.spacing.sm};
`;

const ORIGIN_LABEL: Partial<Record<ProfileItemOrigin["type"], string>> = {
  ikigai: "Del ikigai",
  manual: "Agregado por ti",
};

const ORIGIN_TONE: Partial<Record<ProfileItemOrigin["type"], "info" | "success" | "neutral">> = {
  ikigai: "info",
  manual: "neutral",
};

const SKILL_CATEGORY_LABEL: Record<SkillCategory, string> = {
  hard: "Habilidad dura",
  soft: "Habilidad blanda",
  tool: "Herramienta",
  language: "Idioma",
};

function formatRange(startDate: string, endDate: string | null) {
  return `${startDate} — ${endDate ?? "presente"}`;
}

const EMPTY_EXPERIENCE_FORM = {
  organization: "",
  role: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  contextDescription: "",
};

const EMPTY_SKILL_FORM = { name: "", category: "hard" as SkillCategory };

const EMPTY_EDUCATION_FORM = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
};

type PendingDeletion = { kind: "experience" | "skill" | "education"; id: string; label: string };

export default function EmploymentProfilePage() {
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [experienceModalOpen, setExperienceModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const [experienceForm, setExperienceForm] = useState(EMPTY_EXPERIENCE_FORM);
  const [skillForm, setSkillForm] = useState(EMPTY_SKILL_FORM);
  const [educationForm, setEducationForm] = useState(EMPTY_EDUCATION_FORM);

  useEffect(() => {
    let active = true;
    void getEmploymentProfile()
      .then((profile) => {
        if (!active || !profile) return;
        setExperience(profile.experience);
        setSkills(profile.skills);
        setEducation(profile.education);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu perfil.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submitExperience(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !experienceForm.organization.trim() || !experienceForm.role.trim()) return;
    setBusy("Guardando tu experiencia…"); setError(null);
    try { const entry = await addExperienceEntry({ ...experienceForm, endDate: experienceForm.isCurrent ? null : experienceForm.endDate || null }); setExperience((prev) => [...prev, entry]); setExperienceForm(EMPTY_EXPERIENCE_FORM); setExperienceModalOpen(false); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la experiencia."); }
    finally { setBusy(null); }
  }

  async function submitSkill(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !skillForm.name.trim()) return;
    setBusy("Guardando tu habilidad…"); setError(null);
    try { const entry = await addSkillItem(skillForm); setSkills((prev) => [...prev, entry]); setSkillForm(EMPTY_SKILL_FORM); setSkillModalOpen(false); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la habilidad."); }
    finally { setBusy(null); }
  }

  async function submitEducation(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !educationForm.institution.trim() || !educationForm.degree.trim()) return;
    setBusy("Guardando tus estudios…"); setError(null);
    try { const entry = await addEducationEntry({ ...educationForm, endDate: educationForm.isCurrent ? null : educationForm.endDate || null }); setEducation((prev) => [...prev, entry]); setEducationForm(EMPTY_EDUCATION_FORM); setEducationModalOpen(false); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los estudios."); }
    finally { setBusy(null); }
  }

  async function confirmDeletion() {
    if (busy || !pendingDeletion) return;
    setBusy("Eliminando información…"); setError(null);
    try {
      if (pendingDeletion.kind === "experience") {
        await deleteExperienceEntry(pendingDeletion.id);
        setExperience((items) => items.filter((item) => item.id !== pendingDeletion.id));
      } else if (pendingDeletion.kind === "skill") {
        await deleteSkillItem(pendingDeletion.id);
        setSkills((items) => items.filter((item) => item.id !== pendingDeletion.id));
      } else {
        await deleteEducationEntry(pendingDeletion.id);
        setEducation((items) => items.filter((item) => item.id !== pendingDeletion.id));
      }
      setPendingDeletion(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la información.");
    } finally { setBusy(null); }
  }

  if (loading) return <LoadingState label="Cargando tu perfil…" />;

  return (
    <Page>
      <Heading>
        <Title>Mi perfil</Title>
        <Subtitle>
          Esta es la única fuente de experiencia y habilidades que se usa para generar tus CVs — ningún CV puede
          inventar algo que no esté aquí primero.
        </Subtitle>
      </Heading>

      <Section>
        <SectionHeader>
          <SectionTitle>Experiencia</SectionTitle>
          <Button variant="secondary" onClick={() => setExperienceModalOpen(true)} disabled={Boolean(busy)}>
            Agregar experiencia
          </Button>
        </SectionHeader>
        {experience.map((exp) => (
          <Card key={exp.id}>
            <CardTop>
              <div>
                <RoleLine>{exp.role}</RoleLine>
                <OrgLine>
                  {exp.organization} · {exp.location}
                </OrgLine>
              </div>
              <DateRange>{formatRange(exp.startDate, exp.isCurrent ? null : exp.endDate)}</DateRange>
            </CardTop>
            <Description>{exp.contextDescription}</Description>
            {ORIGIN_LABEL[exp.origin.type] && ORIGIN_TONE[exp.origin.type] && (
              <Badge tone={ORIGIN_TONE[exp.origin.type]}>{ORIGIN_LABEL[exp.origin.type]}</Badge>
            )}
            <Button variant="destructive" onClick={() => setPendingDeletion({ kind: "experience", id: exp.id, label: `${exp.role} en ${exp.organization}` })} disabled={Boolean(busy)}>Eliminar</Button>
          </Card>
        ))}
        {experience.length === 0 && <EmptyState>Agrega la experiencia que mejor muestra lo que sabes hacer. Incluye responsabilidades, herramientas y resultados observables.</EmptyState>}
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Habilidades</SectionTitle>
          <Button variant="secondary" onClick={() => setSkillModalOpen(true)} disabled={Boolean(busy)}>
            Agregar habilidad
          </Button>
        </SectionHeader>
        <SkillGrid>
          {skills.map((skill) => (
            <SkillChip key={skill.id}>
              {skill.name}
              {ORIGIN_LABEL[skill.origin.type] && ORIGIN_TONE[skill.origin.type] && (
                <Badge tone={ORIGIN_TONE[skill.origin.type]}>{ORIGIN_LABEL[skill.origin.type]}</Badge>
              )}
              <Button variant="ghost" aria-label={`Eliminar ${skill.name}`} onClick={() => setPendingDeletion({ kind: "skill", id: skill.id, label: skill.name })} disabled={Boolean(busy)}>×</Button>
            </SkillChip>
          ))}
        </SkillGrid>
        {skills.length === 0 && <EmptyState>Declara habilidades, herramientas e idiomas que quieras considerar al adaptar tu CV a una vacante.</EmptyState>}
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Educación</SectionTitle>
          <Button variant="secondary" onClick={() => setEducationModalOpen(true)} disabled={Boolean(busy)}>
            Agregar estudios
          </Button>
        </SectionHeader>
        {education.map((edu) => (
          <Card key={edu.id}>
            <CardTop>
              <div>
                <RoleLine>{edu.degree}</RoleLine>
                <OrgLine>
                  {edu.institution} · {edu.fieldOfStudy}
                </OrgLine>
              </div>
              <DateRange>{formatRange(edu.startDate, edu.isCurrent ? null : edu.endDate)}</DateRange>
            </CardTop>
            <Button variant="destructive" onClick={() => setPendingDeletion({ kind: "education", id: edu.id, label: `${edu.degree} en ${edu.institution}` })} disabled={Boolean(busy)}>Eliminar</Button>
          </Card>
        ))}
        {education.length === 0 && <EmptyState>Incluye estudios, cursos o formación relevante para que aparezcan cuando aporten a una vacante.</EmptyState>}
      </Section>

      <Modal open={experienceModalOpen} onClose={() => setExperienceModalOpen(false)} ariaLabel="Agregar experiencia">
        <ModalTitle>Agregar experiencia</ModalTitle>
        <ModalForm onSubmit={submitExperience}>
          <FieldRow>
            <FormField label="Organización">
              <Input
                value={experienceForm.organization}
                onChange={(e) => setExperienceForm((f) => ({ ...f, organization: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Puesto">
              <Input
                value={experienceForm.role}
                onChange={(e) => setExperienceForm((f) => ({ ...f, role: e.target.value }))}
                required
              />
            </FormField>
          </FieldRow>
          <FormField label="Ubicación">
            <Input
              value={experienceForm.location}
              onChange={(e) => setExperienceForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Ej. CDMX, remoto…"
            />
          </FormField>
          <FieldRow>
            <FormField label="Inicio">
              <MonthField
                value={experienceForm.startDate}
                onChange={(value) => setExperienceForm((f) => ({ ...f, startDate: value }))}
              />
            </FormField>
            <FormField label="Fin">
              <MonthField
                value={experienceForm.endDate}
                onChange={(value) => setExperienceForm((f) => ({ ...f, endDate: value }))}
                disabled={experienceForm.isCurrent}
              />
            </FormField>
          </FieldRow>
          <CheckboxRow>
            <Checkbox
              checked={experienceForm.isCurrent}
              onChange={(e) => setExperienceForm((f) => ({ ...f, isCurrent: e.target.checked }))}
            />
            Sigo en esta posición actualmente
          </CheckboxRow>
          <FormField label="¿Qué hacías?">
            <Textarea
              value={experienceForm.contextDescription}
              onChange={(e) => setExperienceForm((f) => ({ ...f, contextDescription: e.target.value }))}
              placeholder="Describe tus actividades, sin cifras todavía"
            />
          </FormField>
          <ModalActions>
            <Button type="button" variant="ghost" onClick={() => setExperienceModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={Boolean(busy)}>Guardar experiencia</Button>
          </ModalActions>
        </ModalForm>
      </Modal>

      <Modal open={skillModalOpen} onClose={() => setSkillModalOpen(false)} ariaLabel="Agregar habilidad">
        <ModalTitle>Agregar habilidad</ModalTitle>
        <ModalForm onSubmit={submitSkill}>
          <FormField label="Nombre de la habilidad">
            <Input
              value={skillForm.name}
              onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Excel avanzado"
              required
            />
          </FormField>
          <FormField label="Categoría">
            <Select
              value={skillForm.category}
              onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value as SkillCategory }))}
            >
              {Object.entries(SKILL_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <ModalActions>
            <Button type="button" variant="ghost" onClick={() => setSkillModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={Boolean(busy)}>Guardar habilidad</Button>
          </ModalActions>
        </ModalForm>
      </Modal>

      <Modal open={educationModalOpen} onClose={() => setEducationModalOpen(false)} ariaLabel="Agregar estudios">
        <ModalTitle>Agregar estudios</ModalTitle>
        <ModalForm onSubmit={submitEducation}>
          <FormField label="Institución">
            <Input
              value={educationForm.institution}
              onChange={(e) => setEducationForm((f) => ({ ...f, institution: e.target.value }))}
              required
            />
          </FormField>
          <FieldRow>
            <FormField label="Título / grado">
              <Input
                value={educationForm.degree}
                onChange={(e) => setEducationForm((f) => ({ ...f, degree: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Área de estudio">
              <Input
                value={educationForm.fieldOfStudy}
                onChange={(e) => setEducationForm((f) => ({ ...f, fieldOfStudy: e.target.value }))}
              />
            </FormField>
          </FieldRow>
          <FieldRow>
            <FormField label="Inicio">
              <MonthField
                value={educationForm.startDate}
                onChange={(value) => setEducationForm((f) => ({ ...f, startDate: value }))}
              />
            </FormField>
            <FormField label="Fin">
              <MonthField
                value={educationForm.endDate}
                onChange={(value) => setEducationForm((f) => ({ ...f, endDate: value }))}
                disabled={educationForm.isCurrent}
              />
            </FormField>
          </FieldRow>
          <CheckboxRow>
            <Checkbox
              checked={educationForm.isCurrent}
              onChange={(e) => setEducationForm((f) => ({ ...f, isCurrent: e.target.checked }))}
            />
            Actualmente estudiando aquí
          </CheckboxRow>
          <ModalActions>
            <Button type="button" variant="ghost" onClick={() => setEducationModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={Boolean(busy)}>Guardar estudios</Button>
          </ModalActions>
        </ModalForm>
      </Modal>
      <ConfirmActionDialog
        open={Boolean(pendingDeletion)}
        title="¿Eliminar esta información?"
        description={`Se eliminará ${pendingDeletion?.label ?? "este elemento"} de tu perfil. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        isConfirming={Boolean(busy)}
        onConfirm={() => void confirmDeletion()}
        onClose={() => !busy && setPendingDeletion(null)}
      />
      {error && <p role="alert">{error}</p>}
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
