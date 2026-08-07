"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Form, FormStatus } from "@/domain/entities";
import * as formService from "@/presentation/services/formService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xxl};
  max-width: 1180px;
`;

const Intro = styled.p`
  max-width: 64ch;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const Card = styled.section`
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

const CardHeader = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
`;

const SectionTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Description = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const CreateForm = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) auto;
  align-items: end;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;

    > button {
      width: 100%;
    }
  }
`;

const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Count = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

const FilterLabel = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const STATUS_TONE: Record<FormStatus, "neutral" | "success" | "warning"> = {
  draft: "neutral",
  published: "success",
  closed: "warning",
  archived: "neutral",
};

const STATUS_LABEL: Record<FormStatus, string> = { draft: "Borrador", published: "Publicado", closed: "Cerrado", archived: "Archivado" };
const STATUS_FILTERS: FormStatus[] = ["published", "draft", "closed", "archived"];
type LoadState = "loading" | "loaded" | "error";

export default function AdminFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<FormStatus>>(
    () => new Set(["published", "draft"])
  );

  const filteredForms = forms.filter((form) => visibleStatuses.has(form.status));

  function toggleStatus(status: FormStatus) {
    setVisibleStatuses((previous) => {
      const next = new Set(previous);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  useEffect(() => {
    formService
      .listForms()
      .then((items) => {
        setForms(items);
        setLoadState("loaded");
      })
      .catch(() => {
        setError("No se pudieron cargar los formularios. Intenta recargar la página.");
        setLoadState("error");
      });
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const form = await formService.createForm({ title, description: description || null });
      setForms((prev) => [form, ...prev]);
      setTitle("");
      setDescription("");
      setSuccess(`El formulario “${form.title}” se creó como borrador. Ya puedes configurarlo.`);
    } catch {
      setError("No se pudo crear el formulario. Revisa los datos e inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDuplicate(formId: string) {
    setError(null);
    setDuplicatingId(formId);
    try {
      const duplicated = await formService.duplicateForm(formId);
      router.push(`/admin/forms/${duplicated.id}`);
    } catch {
      setError("No se pudo duplicar el formulario. Intenta nuevamente.");
      setDuplicatingId(null);
    }
  }

  return (
    <Page>
      <Intro>Crea, configura y publica evaluaciones. Los borradores no estarán visibles para los participantes hasta que los publiques.</Intro>

      <Card>
        <div>
          <SectionTitle>Crear formulario</SectionTitle>
          <Description>Empieza con la información básica; podrás definir preguntas y asignaciones después.</Description>
        </div>
        <CreateForm onSubmit={handleCreate}>
          <FormField label="Título" htmlFor="form-title">
            <Input id="form-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </FormField>
          <FormField label="Descripción (opcional)" htmlFor="form-description">
            <Input id="form-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creando…" : "Crear formulario"}</Button>
        </CreateForm>
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
        {success && <FormStatusMessage variant="success" role="status">{success}</FormStatusMessage>}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <SectionTitle>Tus formularios</SectionTitle>
            <Description>Abre un formulario para editarlo, asignarlo o consultar su estado.</Description>
          </div>
          {loadState === "loaded" && <Count>{filteredForms.length} de {forms.length} {forms.length === 1 ? "formulario" : "formularios"}</Count>}
        </CardHeader>
        <FilterBar aria-label="Filtrar formularios por estado">
          <FilterLabel>Mostrar:</FilterLabel>
          {STATUS_FILTERS.map((status) => {
            const active = visibleStatuses.has(status);
            return (
              <Button
                key={status}
                type="button"
                variant={active ? "primary" : "secondary"}
                aria-pressed={active}
                onClick={() => toggleStatus(status)}
              >
                {STATUS_LABEL[status]}
              </Button>
            );
          })}
        </FilterBar>
        {loadState === "loading" && <LoadingState label="Cargando formularios…" />}
        {loadState === "error" && <EmptyState title="No fue posible cargar los formularios" description="Actualiza la página para volver a intentarlo." />}
        {loadState === "loaded" && forms.length === 0 && <EmptyState title="Aún no hay formularios" description="Crea tu primer formulario para comenzar a evaluar." />}
        {loadState === "loaded" && forms.length > 0 && filteredForms.length === 0 && (
          <EmptyState title="No hay formularios con estos estados" description="Activa otro estado para ver más formularios." />
        )}
        {loadState === "loaded" && filteredForms.length > 0 && (
          <TableScroll>
            <Table>
              <Thead><Tr><Th>Título</Th><Th>Estado</Th><Th>Respuestas</Th><Th>Creado</Th><Th><span className="sr-only">Acciones</span></Th></Tr></Thead>
              <Tbody>
                {filteredForms.map((form) => (
                  <Tr key={form.id}>
                    <Td>{form.title}</Td>
                    <Td><Badge tone={STATUS_TONE[form.status]}>{STATUS_LABEL[form.status]}</Badge></Td>
                    <Td><Badge tone={form.acceptingResponses ? "success" : "neutral"}>{form.acceptingResponses ? "Abiertas" : "Cerradas"}</Badge></Td>
                    <Td>{new Date(form.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      <ActionGroup>
                        <Button as={Link} href={`/admin/forms/${form.id}`} variant="secondary">Gestionar</Button>
                        <Button variant="ghost" onClick={() => handleDuplicate(form.id)} disabled={duplicatingId === form.id}>
                          {duplicatingId === form.id ? "Duplicando…" : "Duplicar"}
                        </Button>
                      </ActionGroup>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </Page>
  );
}
