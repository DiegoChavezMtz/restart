"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Form, FormStatus } from "@/domain/entities";
import * as formService from "@/presentation/services/formService";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 900px;
  margin-bottom: ${(props) => props.theme.spacing.xxl};
`;

const CreateForm = styled.form`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  align-items: flex-start;
`;

const SectionTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
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

export default function AdminFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    formService.listForms().then(setForms).catch(() => setError("No se pudieron cargar los formularios."));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const form = await formService.createForm({ title, description: description || null });
      setForms((prev) => [form, ...prev]);
      setTitle("");
      setDescription("");
    } catch {
      setError("No se pudo crear el formulario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicate(formId: string) {
    setDuplicatingId(formId);
    try {
      const duplicated = await formService.duplicateForm(formId);
      router.push(`/admin/forms/${duplicated.id}`);
    } catch {
      setError("No se pudo duplicar el formulario.");
      setDuplicatingId(null);
    }
  }

  return (
    <>
      <Section>
        <Button as={Link} href={`/admin/`} variant="secondary">{"<- Regresar"} </Button>
        <SectionTitle>Nuevo formulario</SectionTitle>
        <CreateForm onSubmit={handleCreate}>
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando…" : "Crear"}
          </Button>
        </CreateForm>
        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
      </Section>

      <Section>
        <SectionTitle>Formularios</SectionTitle>
        <Table>
          <Thead>
            <Tr>
              <Th>Título</Th>
              <Th>Estado</Th>
              <Th>Acepta respuestas</Th>
              <Th>Creado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {forms.map((form) => (
              <Tr key={form.id}>
                <Td>{form.title}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[form.status]}>{STATUS_LABEL[form.status]}</Badge>
                </Td>
                <Td>
                  <Badge tone={form.acceptingResponses ? "success" : "neutral"}>
                    {form.acceptingResponses ? "Sí" : "No"}
                  </Badge>
                </Td>
                <Td>{new Date(form.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <Button as={Link} href={`/admin/forms/${form.id}`} variant="secondary">
                    Ver
                  </Button>{" "}
                  <Button
                    variant="secondary"
                    onClick={() => handleDuplicate(form.id)}
                    disabled={duplicatingId === form.id}
                  >
                    {duplicatingId === form.id ? "Duplicando…" : "Duplicar"}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Section>
    </>
  );
}
