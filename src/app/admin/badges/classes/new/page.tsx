"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as badgeService from "@/presentation/services/badgeService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 640px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};

  &:hover {
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Card = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-family: inherit;
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};
`;

export default function NewBadgeClassPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const badgeClass = await badgeService.createBadgeClass({
        name,
        description,
        criteria,
        image,
        validMonths: null,
      });
      router.push(`/admin/badges/assign?badgeClassId=${badgeClass.id}`);
    } catch {
      setError("No se pudo crear la insignia. Revisa los datos e inténtalo otra vez.");
      setIsSubmitting(false);
    }
  }

  return (
    <Page>
      <BackLink href="/admin/badges">← Todas las insignias</BackLink>
      <Title>Crear insignia</Title>

      <Card onSubmit={handleSubmit}>
        <FormField label="Nombre" htmlFor="badge-name">
          <Input id="badge-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <FormField label="Descripción" htmlFor="badge-description">
          <TextArea id="badge-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Criterios de obtención" htmlFor="badge-criteria">
          <TextArea id="badge-criteria" value={criteria} onChange={(e) => setCriteria(e.target.value)} />
        </FormField>
        <FormField label="Imagen (SVG o PNG, máx. 1 MB)" htmlFor="badge-image">
          <Input
            id="badge-image"
            type="file"
            accept="image/svg+xml,image/png"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
        </FormField>
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? "Creando…" : "Crear insignia"}
        </Button>
      </Card>
    </Page>
  );
}
