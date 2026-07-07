"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Cohort } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 720px;
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

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cohortService.listCohorts().then(setCohorts).catch(() => setError("No se pudieron cargar las cohortes."));
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const cohort = await cohortService.createCohort({
        name,
        description: description || null,
      });
      setCohorts((prev) => [cohort, ...prev]);
      setName("");
      setDescription("");
    } catch {
      setError("No se pudo crear la cohorte.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Section>
        <SectionTitle>Nueva cohorte</SectionTitle>
        <CreateForm onSubmit={handleCreate}>
          <Input
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
         <Button as={Link} href={`/admin/forms/`}>Ir a formularios +</Button>
      </Section>
      <Section>
        <SectionTitle>Cohortes</SectionTitle>
        <Table>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>Descripción</Th>
              <Th>Creada</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {cohorts.map((cohort) => (
              <Tr key={cohort.id}>
                <Td>{cohort.name}</Td>
                <Td>{cohort.description ?? "—"}</Td>
                <Td>{new Date(cohort.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <Button as={Link} href={`/admin/cohorts/${cohort.id}`} variant="secondary">
                    Ver
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
