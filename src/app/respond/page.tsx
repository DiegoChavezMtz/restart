"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { FormResponseStatus } from "@/domain/entities";
import { getProfileCompletionStatus } from "@/presentation/services/profileCompletionService";
import * as responseService from "@/presentation/services/responseService";
import type { VisibleForm } from "@/presentation/services/responseService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 960px;
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

const Card = styled.div`
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) {
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const EmploymentBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.lg} ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  background: linear-gradient(135deg, ${(props) => props.theme.colors.primary}, ${(props) => props.theme.colors.accentPurple});
  color: ${(props) => props.theme.colors.background};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const EmploymentBannerText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

type LoadState = "loading" | "loaded" | "error";

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
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [employmentProfileComplete, setEmploymentProfileComplete] = useState(false);

  useEffect(() => {
    responseService
      .listVisibleForms()
      .then((forms) => {
        setVisibleForms(forms);
        setLoadState("loaded");
      })
      .catch(() => {
        setError("No pudimos cargar tus formularios. Intenta recargar la página.");
        setLoadState("error");
      });
  }, []);

  useEffect(() => {
    // Silencioso a propósito: si falla, simplemente no se muestra el botón
    // de edición — no es crítico para el resto de la página.
    getProfileCompletionStatus()
      .then((status) => setEmploymentProfileComplete(status.complete))
      .catch(() => setEmploymentProfileComplete(false));
  }, []);

  return (
    <Page>
      <Heading>
        <Title>Mis formularios</Title>
        <Subtitle>Aquí encontrarás las evaluaciones disponibles y podrás continuar las que dejaste pendientes.</Subtitle>
      </Heading>
      {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
      <EmploymentBanner>
        <EmploymentBannerText>
          <strong>Empleabilidad</strong>
          <span>Arma tu perfil, genera CVs adaptados a cada vacante y da seguimiento a tus postulaciones.</span>
        </EmploymentBannerText>
        <Button as={Link} href="/employment" variant="secondary">
          Ir a empleabilidad
        </Button>
        {employmentProfileComplete && (
          <Button as={Link} href="/employment/complete-profile" variant="secondary">
            Editar mis datos de contacto
          </Button>
        )}
      </EmploymentBanner>
      <Card>
        {loadState === "loading" && <LoadingState label="Cargando tus formularios…" />}
        {loadState === "error" && <EmptyState title="No pudimos cargar tus formularios" description="Actualiza la página para volver a intentarlo." />}
        {loadState === "loaded" && visibleForms.length === 0 && <EmptyState title="No tienes formularios pendientes" description="Cuando te asignen una evaluación, aparecerá aquí." />}
        {loadState === "loaded" && visibleForms.length > 0 && (
          <TableScroll>
            <Table>
              <Thead><Tr><Th>Formulario</Th><Th>Estado</Th><Th><span className="sr-only">Acción</span></Th></Tr></Thead>
              <Tbody>
                {visibleForms.map(({ form, status }) => (
                  <Tr key={form.id}>
                    <Td>{form.title}</Td>
                    <Td><Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge></Td>
                    <Td>
                      {status !== "completed" ? (
                        <Button as={Link} href={`/respond/${form.id}`} variant={status === "in_progress" ? "primary" : "secondary"}>
                          {status === "in_progress" ? "Continuar" : "Responder"}
                        </Button>
                      ) : "—"}
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
