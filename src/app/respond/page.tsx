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
import * as participantAttendance from "@/presentation/services/participantAttendanceService";
import * as responseService from "@/presentation/services/responseService";
import type { VisibleForm } from "@/presentation/services/responseService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 960px;
  min-width: 0;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  min-width: 0;
`;

const ModuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  min-width: 0;
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

const SectionTitle = styled.h2`
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

type ModuleTone = "employment" | "evaluations" | "attendance";

const ModuleBanner = styled.div<{ $tone: ModuleTone }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.lg} ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  min-width: 0;
  background: ${(props) => {
    const gradients = {
      employment: `linear-gradient(135deg, ${props.theme.colors.moduleEmploymentStart}, ${props.theme.colors.moduleEmploymentEnd})`,
      evaluations: `linear-gradient(135deg, ${props.theme.colors.moduleEvaluationsStart}, ${props.theme.colors.moduleEvaluationsEnd})`,
      attendance: `linear-gradient(135deg, ${props.theme.colors.moduleAttendanceStart}, ${props.theme.colors.moduleAttendanceEnd})`,
    };
    return gradients[props.$tone];
  }};
  color: ${(props) => props.theme.colors.background};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    padding: ${(props) => props.theme.spacing.lg};

    > a,
    > button {
      width: 100%;
    }
  }
`;

const ModuleBannerText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  min-width: 0;

  span {
    overflow-wrap: anywhere;
  }
`;

const FormsTable = styled(Table)`
  table-layout: fixed;

  th:first-child,
  td:first-child {
    width: 58%;
    overflow-wrap: anywhere;
  }

  @media (max-width: 767px) {
    table-layout: auto;

    && td {
      display: block;
      padding: ${(props) => props.theme.spacing.xs} 0;
    }

    && td:first-child {
      padding-top: 0;
      color: ${(props) => props.theme.colors.textPrimary};
      font-size: ${(props) => props.theme.typography.fontSize.lg};
      font-weight: ${(props) => props.theme.typography.fontWeight.medium};
    }

    && td:last-child {
      padding-bottom: 0;
    }

    && td > a,
    && td > button {
      width: 100%;
    }
  }
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
  const [attendanceSummary, setAttendanceSummary] = useState<participantAttendance.ParticipantAttendanceSummary | null>(null);

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
    participantAttendance.getMyAttendance()
      .then((attendance) => setAttendanceSummary(attendance.summary))
      .catch(() => setAttendanceSummary(null));
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
      {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
      <Section>
        <Heading>
          <Title>Mi espacio</Title>
          <Subtitle>Accede a las herramientas y el seguimiento de tu programa.</Subtitle>
        </Heading>
        <ModuleList>
          <ModuleBanner $tone="employment">
            <ModuleBannerText>
              <strong>Empleabilidad</strong>
              <span>Arma tu perfil, genera CVs adaptados a cada vacante y da seguimiento a tus postulaciones.</span>
            </ModuleBannerText>
            <Button as={Link} href="/employment" variant="secondary">
              Ir a empleabilidad
            </Button>
            {employmentProfileComplete && (
              <Button as={Link} href="/employment/complete-profile" variant="secondary">
                Editar mis datos de contacto
              </Button>
            )}
          </ModuleBanner>
          <ModuleBanner $tone="evaluations">
            <ModuleBannerText>
              <strong>Evaluaciones</strong>
              <span>Consulta tus calificaciones y descarga el detalle de tus evaluaciones publicadas.</span>
            </ModuleBannerText>
            <Button as={Link} href="/respond/evaluations" variant="secondary">Ver evaluaciones</Button>
          </ModuleBanner>
          {attendanceSummary && (
            <ModuleBanner $tone="attendance">
              <ModuleBannerText>
                <strong>Mi asistencia</strong>
                <span>Desde julio: {attendanceSummary.absent} falta{attendanceSummary.absent === 1 ? "" : "s"}, {attendanceSummary.late} retardo{attendanceSummary.late === 1 ? "" : "s"} y {attendanceSummary.justified} justificada{attendanceSummary.justified === 1 ? "" : "s"}.</span>
              </ModuleBannerText>
              <Button as={Link} href="/respond/attendance" variant="secondary">Ver detalle</Button>
            </ModuleBanner>
          )}
        </ModuleList>
      </Section>
      <Section>
        <Heading>
          <SectionTitle>Mis formularios</SectionTitle>
          <Subtitle>Aquí encontrarás las evaluaciones disponibles y podrás continuar las que dejaste pendientes.</Subtitle>
        </Heading>
        <Card>
          {loadState === "loading" && <LoadingState label="Cargando tus formularios…" />}
          {loadState === "error" && <EmptyState title="No pudimos cargar tus formularios" description="Actualiza la página para volver a intentarlo." />}
          {loadState === "loaded" && visibleForms.length === 0 && <EmptyState title="No tienes formularios pendientes" description="Cuando te asignen una evaluación, aparecerá aquí." />}
          {loadState === "loaded" && visibleForms.length > 0 && (
            <TableScroll>
              <FormsTable>
                <Thead><Tr><Th>Formulario</Th><Th>Estado</Th><Th><span className="sr-only">Acción</span></Th></Tr></Thead>
                <Tbody>
                  {visibleForms.map(({ form, status }) => (
                    <Tr key={form.id}>
                      <Td>{form.title}</Td>
                      <Td><Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge></Td>
                      {status !== "completed" && (
                        <Td>
                          <Button as={Link} href={`/respond/${form.id}`} variant={status === "in_progress" ? "primary" : "secondary"}>
                            {status === "in_progress" ? "Continuar" : "Responder"}
                          </Button>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </FormsTable>
            </TableScroll>
          )}
        </Card>
      </Section>
    </Page>
  );
}
