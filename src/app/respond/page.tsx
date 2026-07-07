"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { FormResponseStatus } from "@/domain/entities";
import * as responseService from "@/presentation/services/responseService";
import type { VisibleForm } from "@/presentation/services/responseService";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 900px;
`;

const SectionTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const STATUS_TONE: Record<"not_started" | FormResponseStatus, "neutral" | "success" | "warning"> = {
  not_started: "neutral",
  in_progress: "warning",
  completed: "success",
};

const STATUS_LABEL: Record<"not_started" | FormResponseStatus, string> = {
  not_started: "Sin empezar",
  in_progress: "En progreso",
  completed: "Completado",
};

export default function RespondListPage() {
  const [visibleForms, setVisibleForms] = useState<VisibleForm[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    responseService
      .listVisibleForms()
      .then(setVisibleForms)
      .catch(() => setError("No se pudieron cargar los formularios."));
  }, []);

  return (
    <Section>
      <SectionTitle>Mis formularios</SectionTitle>
      {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
      <Table>
        <Thead>
          <Tr>
            <Th>Formulario</Th>
            <Th>Estado</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {visibleForms.map(({ form, status }) => (
            <Tr key={form.id}>
              <Td>{form.title}</Td>
              <Td>
                <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
              </Td>
              <Td>
                {status !== "completed" && (
                  <Button as={Link} href={`/respond/${form.id}`} variant="secondary">
                    {status === "in_progress" ? "Continuar" : "Responder"}
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Section>
  );
}
