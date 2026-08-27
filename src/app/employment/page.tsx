"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import type { ApplicationStatus, EmploymentProfile, IkigaiProfile, JobApplication, JobTarget } from "@/domain/entities";
import { getIkigaiProfile } from "@/presentation/services/ikigaiService";
import { getEmploymentProfile } from "@/presentation/services/employmentProfileService";
import { listApplications } from "@/presentation/services/applicationService";
import { listJobTargets } from "@/presentation/services/jobTargetService";
import { getProfileCompletionStatus, type ProfileCompletionStatus } from "@/presentation/services/profileCompletionService";
import { listCvVersions } from "@/presentation/services/cvService";

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: ${(props) => props.theme.spacing.lg};
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
`;

const CardTitle = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
`;

const CardMetric = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize["2xl"]};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const CardHint = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const CardFooter = styled.div`
  margin-top: auto;
  padding-top: ${(props) => props.theme.spacing.xs};
`;

const IkigaiSnippet = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Aplicado",
  response: "Respuesta recibida",
  interview: "Entrevista",
  offer: "Oferta",
  rejected: "Rechazado",
};

export default function EmploymentDashboardPage() {
  const [ikigai, setIkigai] = useState<IkigaiProfile | null>(null); const [profile, setProfile] = useState<EmploymentProfile | null>(null); const [applications, setApplications] = useState<JobApplication[]>([]); const [targets, setTargets] = useState<JobTarget[]>([]); const [completion, setCompletion] = useState<ProfileCompletionStatus | null>(null); const [cvCount, setCvCount] = useState(0);
  useEffect(() => { void Promise.all([getIkigaiProfile(), getEmploymentProfile(), listApplications(), listJobTargets(), getProfileCompletionStatus(), listCvVersions()]).then(([i, p, a, t, c, cvs]) => { setIkigai(i); setProfile(p); setApplications(a); setTargets(t); setCompletion(c); setCvCount(cvs.length); }); }, []);
  const missingActions = [
    ...(completion?.missing.includes("fullName") ? [{ label: "Completa tu nombre de contacto", href: "/employment/complete-profile" }] : []),
    ...(completion?.missing.includes("phone") ? [{ label: "Agrega tu teléfono", href: "/employment/complete-profile" }] : []),
    ...(completion?.missing.includes("location") ? [{ label: "Agrega tu ubicación", href: "/employment/complete-profile" }] : []),
    ...((profile?.experience.length ?? 0) === 0 ? [{ label: "Registra una experiencia", href: "/employment/profile" }] : []),
    ...((profile?.skills.length ?? 0) === 0 ? [{ label: "Declara tus habilidades", href: "/employment/profile" }] : []),
    ...(targets.length === 0 ? [{ label: "Analiza una vacante real", href: "/employment/targets/new" }] : []),
    ...(cvCount === 0 ? [{ label: "Genera un borrador de CV", href: "/employment/targets" }] : []),
  ];
  const nextAction = missingActions[0];

  const activeApplications = applications.filter((a) => a.status !== "offer" && a.status !== "rejected");
  const mostRecentApplication = [...applications].sort(
    (a, b) => new Date(b.statusUpdatedAt).getTime() - new Date(a.statusUpdatedAt).getTime()
  )[0];

  return (
    <Page>
      <Heading>
        <Title>Empleabilidad</Title>
        <Subtitle>
          Tu espacio para construir tu perfil, generar CVs adaptados a cada vacante y dar seguimiento a tus postulaciones.
        </Subtitle>
      </Heading>

      <Grid>
        <Card>
          <CardTitle>Siguiente acción</CardTitle>
          <CardMetric>{missingActions.length}</CardMetric>
          <CardHint>{nextAction?.label ?? "Tu perfil tiene lo esencial para seguir avanzando."}</CardHint>
          <CardFooter>
            <Button as={Link} href={nextAction?.href ?? "/employment/insights"} variant="secondary">
              {nextAction ? "Ir a la acción" : "Ver decisiones"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardTitle>Ikigai</CardTitle>
          <IkigaiSnippet>{ikigai?.synthesis || "Aún no has completado tu síntesis."}</IkigaiSnippet>
          <CardFooter>
            <Button as={Link} href="/employment/ikigai" variant="secondary">
              Editar ikigai
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardTitle>Postulaciones activas</CardTitle>
          <CardMetric>{activeApplications.length}</CardMetric>
          <CardHint>De {applications.length} en total</CardHint>
          <CardFooter>
            <Button as={Link} href="/employment/applications" variant="secondary">
              Ver seguimiento
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardTitle>Vacantes analizadas</CardTitle>
          <CardMetric>{targets.length}</CardMetric>
          <CardHint>Con palabras clave extraídas</CardHint>
          <CardFooter>
            <Button as={Link} href="/employment/targets/new" variant="secondary">
              Analizar una vacante
            </Button>
          </CardFooter>
        </Card>
      </Grid>

      {mostRecentApplication && (
        <Card>
          <CardTitle>Actividad reciente</CardTitle>
          <CardHint>
            {mostRecentApplication.companyName} · {mostRecentApplication.roleTitle}
          </CardHint>
          <Badge tone="info">{STATUS_LABEL[mostRecentApplication.status]}</Badge>
        </Card>
      )}
    </Page>
  );
}
