"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Cohort } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xxl};
  max-width: 1080px;
`;

const Intro = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.lg};

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const IntroText = styled.p`
  max-width: 62ch;
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
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
`;

const SectionTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const SectionDescription = styled.p`
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

const Count = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

type LoadState = "loading" | "loaded" | "error";

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cohortService
      .listCohorts()
      .then((items) => {
        setCohorts(items);
        setLoadState("loaded");
      })
      .catch(() => {
        setError("No se pudieron cargar las cohortes. Intenta recargar la página.");
        setLoadState("error");
      });
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const cohort = await cohortService.createCohort({ name, description: description || null });
      setCohorts((prev) => [cohort, ...prev]);
      setName("");
      setDescription("");
      setSuccess(`La cohorte “${cohort.name}” está lista para recibir participantes.`);
    } catch {
      setError("No se pudo crear la cohorte. Revisa los datos e inténtalo otra vez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Page>
      <Intro>
        <IntroText>Organiza a tus participantes por grupo y consulta su avance desde un mismo lugar.</IntroText>
        <Button as={Link} href="/admin/forms" variant="secondary">
          Ver formularios
        </Button>
      </Intro>

      <Card>
        <div>
          <SectionTitle>Crear cohorte</SectionTitle>
          <SectionDescription>Agrega un nombre y una descripción para identificarla rápidamente.</SectionDescription>
        </div>
        <CreateForm onSubmit={handleCreate}>
          <FormField label="Nombre" htmlFor="cohort-name">
            <Input id="cohort-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Descripción (opcional)" htmlFor="cohort-description">
            <Input id="cohort-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando…" : "Crear cohorte"}
          </Button>
        </CreateForm>
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
        {success && <FormStatusMessage variant="success" role="status">{success}</FormStatusMessage>}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <SectionTitle>Tus cohortes</SectionTitle>
            <SectionDescription>Abre una cohorte para gestionar participantes e invitaciones.</SectionDescription>
          </div>
          {loadState === "loaded" && <Count>{cohorts.length} {cohorts.length === 1 ? "cohorte" : "cohortes"}</Count>}
        </CardHeader>

        {loadState === "loading" && <LoadingState label="Cargando cohortes…" />}
        {loadState === "error" && <EmptyState title="No fue posible cargar las cohortes" description="Actualiza la página para volver a intentarlo." />}
        {loadState === "loaded" && cohorts.length === 0 && (
          <EmptyState title="Aún no hay cohortes" description="Crea la primera cohorte para empezar a organizar participantes." />
        )}
        {loadState === "loaded" && cohorts.length > 0 && (
          <TableScroll>
            <Table>
              <Thead>
                <Tr><Th>Nombre</Th><Th>Descripción</Th><Th>Creada</Th><Th><span className="sr-only">Acciones</span></Th></Tr>
              </Thead>
              <Tbody>
                {cohorts.map((cohort) => (
                  <Tr key={cohort.id}>
                    <Td>{cohort.name}</Td>
                    <Td>{cohort.description ?? "Sin descripción"}</Td>
                    <Td>{new Date(cohort.createdAt).toLocaleDateString()}</Td>
                    <Td><Button as={Link} href={`/admin/cohorts/${cohort.id}`} variant="secondary">Gestionar</Button></Td>
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
