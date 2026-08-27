"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import { getSafeNextPath } from "@/presentation/services/authNavigation";
import { completeUserProfile, getProfileCompletionStatus } from "@/presentation/services/profileCompletionService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 560px;
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
`;

const EMPTY_FORM = { fullName: "", phone: "", location: "", linkedinUrl: "" };

export default function CompleteEmploymentProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyMessage = saving ? "Guardando tus datos de contacto…" : null;
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let active = true;
    void getProfileCompletionStatus()
      .then((status) => {
        if (!active) return;
        setForm({
          fullName: status.fullName,
          phone: status.phone,
          location: status.location,
          linkedinUrl: status.linkedinUrl ?? "",
        });
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo cargar tu información.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await completeUserProfile({
        fullName: form.fullName,
        phone: form.phone,
        location: form.location,
        linkedinUrl: form.linkedinUrl.trim() || null,
      });
      const next = getSafeNextPath(searchParams.get("next"));
      router.replace(next && next.startsWith("/employment") ? next : "/employment");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar tus datos.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando tu información…" />;

  return (
    <Page>
      <Heading>
        <Title>Completa tu perfil</Title>
        <Subtitle>
          Necesitamos estos datos para generar tus CVs y darte seguimiento correctamente — nombre completo, teléfono y
          ubicación. LinkedIn es opcional.
        </Subtitle>
      </Heading>

      <Form onSubmit={handleSubmit}>
        {error && (
          <FormStatusMessage variant="error" role="alert">
            {error}
          </FormStatusMessage>
        )}
        <FormField label="Nombre completo">
          <Input
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Nombre y apellido"
            required
          />
        </FormField>
        <FormField label="Teléfono">
          <Input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="55 1234 5678"
            required
          />
        </FormField>
        <FormField label="Ubicación">
          <Input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="CDMX, México"
            required
          />
        </FormField>
        <FormField label="LinkedIn (opcional)">
          <Input
            value={form.linkedinUrl}
            onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            placeholder="linkedin.com/in/tu-usuario"
          />
        </FormField>
        <Button type="submit" disabled={saving}>
          Guardar y continuar
        </Button>
      </Form>
      {busyMessage && <ProcessingOverlay message={busyMessage} />}
    </Page>
  );
}
