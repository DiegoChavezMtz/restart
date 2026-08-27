"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { FormField } from "@/presentation/molecules/FormField";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import {
  generateIkigaiSynthesis,
  getIkigaiProfile,
  updateIkigaiProfile,
} from "@/presentation/services/ikigaiService";

type IkigaiForm = {
  whatYouLove: string;
  whatYouAreGoodAt: string;
  whatWorldNeeds: string;
  whatYouCanBePaidFor: string;
  synthesis: string;
};

const emptyForm: IkigaiForm = {
  whatYouLove: "",
  whatYouAreGoodAt: "",
  whatWorldNeeds: "",
  whatYouCanBePaidFor: "",
  synthesis: "",
};

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

const Diagram = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${(props) => props.theme.spacing.lg};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Quadrant = styled.div<{ $tone: "love" | "good" | "world" | "paid" }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.lg};
  border-radius: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
  border-top: 4px solid
    ${(props) =>
      ({
        love: props.theme.colors.primary,
        good: props.theme.colors.accentCyan,
        world: props.theme.colors.accentPurple,
        paid: props.theme.colors.success,
      })[props.$tone]};
`;

const QuadrantLabel = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const QuadrantHint = styled.p`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 110px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-family: inherit;
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};
  resize: vertical;

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }
`;

const SynthesisCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surfaceElevated};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const SynthesisHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
`;

const SynthesisTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
`;

const SavedHint = styled.span`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
`;

const ErrorMessage = styled.p`
  color: ${(props) => props.theme.colors.error};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

export default function IkigaiPage() {
  const [form, setForm] = useState<IkigaiForm>(emptyForm);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const profile = await getIkigaiProfile();
        if (!active) return;
        if (profile) {
          setForm({
            whatYouLove: profile.whatYouLove,
            whatYouAreGoodAt: profile.whatYouAreGoodAt,
            whatWorldNeeds: profile.whatWorldNeeds,
            whatYouCanBePaidFor: profile.whatYouCanBePaidFor,
            synthesis: profile.synthesis ?? "",
          });
          setUpdatedAt(profile.updatedAt);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu ikigai.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  function update(field: keyof IkigaiForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError(null);
  }

  async function saveChanges() {
    if (busy) return;
    setBusy("Guardando tu ikigai…");
    setError(null);
    try {
      const profile = await updateIkigaiProfile({
        ...form,
        synthesis: form.synthesis || null,
      });
      setUpdatedAt(profile.updatedAt);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los cambios.");
    } finally {
      setBusy(null);
    }
  }

  async function generateSynthesis() {
    if (busy) return;
    setBusy("Buscando las palabras para tu síntesis…");
    setError(null);
    try {
      const { synthesis } = await generateIkigaiSynthesis({
        whatYouLove: form.whatYouLove,
        whatYouAreGoodAt: form.whatYouAreGoodAt,
        whatWorldNeeds: form.whatWorldNeeds,
        whatYouCanBePaidFor: form.whatYouCanBePaidFor,
      });
      setForm((previous) => ({ ...previous, synthesis }));
      setSaved(false);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudo generar la síntesis. Inténtalo de nuevo."
      );
    } finally {
      setBusy(null);
    }
  }

  function formatUpdatedAt(value: string | null): string {
    if (!value) return "Aún no has guardado tu ikigai";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : `Última actualización: ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date)}`;
  }

  if (loading) return <LoadingState label="Cargando tu ikigai…" />;

  return (
    <Page>
      <Heading>
        <Title>Tu ikigai</Title>
        <Subtitle>
          Este ejercicio es tuyo y siempre editable — no se bloquea como un formulario. Actualízalo cuando descubras algo
          nuevo sobre ti, y usaremos esta base para sugerirte experiencia y habilidades en tu perfil.
        </Subtitle>
      </Heading>

      <Diagram>
        <Quadrant $tone="love">
          <QuadrantLabel>Lo que amas</QuadrantLabel>
          <QuadrantHint>Actividades donde se te olvida el tiempo</QuadrantHint>
          <Textarea value={form.whatYouLove} onChange={(e) => update("whatYouLove", e.target.value)} />
        </Quadrant>
        <Quadrant $tone="good">
          <QuadrantLabel>En lo que eres bueno</QuadrantLabel>
          <QuadrantHint>Lo que otros reconocen que haces bien</QuadrantHint>
          <Textarea value={form.whatYouAreGoodAt} onChange={(e) => update("whatYouAreGoodAt", e.target.value)} />
        </Quadrant>
        <Quadrant $tone="world">
          <QuadrantLabel>Lo que el mundo necesita</QuadrantLabel>
          <QuadrantHint>Un problema real que te gustaría resolver</QuadrantHint>
          <Textarea value={form.whatWorldNeeds} onChange={(e) => update("whatWorldNeeds", e.target.value)} />
        </Quadrant>
        <Quadrant $tone="paid">
          <QuadrantLabel>Por lo que te pueden pagar</QuadrantLabel>
          <QuadrantHint>Habilidades con valor de mercado</QuadrantHint>
          <Textarea value={form.whatYouCanBePaidFor} onChange={(e) => update("whatYouCanBePaidFor", e.target.value)} />
        </Quadrant>
      </Diagram>

      <SynthesisCard>
        <SynthesisHeader>
          <SynthesisTitle>Síntesis</SynthesisTitle>
          <Badge tone="info">Sugerida por IA</Badge>
        </SynthesisHeader>
        <FormField label="Tu vocación en una idea">
          <Textarea value={form.synthesis} onChange={(e) => update("synthesis", e.target.value)} />
        </FormField>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void generateSynthesis()}
          disabled={Boolean(busy)}
        >
          Generar síntesis con IA
        </Button>
      </SynthesisCard>

      <Footer>
        <SavedHint>{saved ? formatUpdatedAt(updatedAt) : "Cambios sin guardar"}</SavedHint>
        <Button onClick={() => void saveChanges()} disabled={saved || Boolean(busy)}>
          Guardar cambios
        </Button>
      </Footer>
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
