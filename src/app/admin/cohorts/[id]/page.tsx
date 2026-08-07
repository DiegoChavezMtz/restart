"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Cohort, Invitation, User } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xxl};
  max-width: 1180px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};

  &:hover {
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const CohortHero = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Description = styled.p`
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

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const SectionTitle = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Meta = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const LinkText = styled.code`
  display: block;
  max-width: 360px;
  overflow: hidden;
  color: ${(props) => props.theme.colors.accentCyan};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type LoadState = "loading" | "loaded" | "not_found" | "error";

export default function CohortDetailPage() {
  const params = useParams<{ id: string }>();
  const cohortId = params.id;
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deactivatingToken, setDeactivatingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([cohortService.getCohortDetail(cohortId), cohortService.listInvitationsByCohort(cohortId)])
      .then(([detail, invitationList]) => {
        setCohort(detail.cohort);
        setParticipants(detail.participants);
        setInvitations(invitationList);
        setLoadState("loaded");
      })
      .catch((err) => setLoadState(err?.response?.status === 404 ? "not_found" : "error"));
  }, [cohortId]);

  async function handleGenerateInvitation(intendedRole: "usuario" | "test") {
    setError(null);
    setIsGenerating(true);
    try {
      const invitation = await cohortService.generateInvitation(cohortId, intendedRole);
      setInvitations((prev) => [invitation, ...prev]);
    } catch {
      setError("No se pudo generar la invitación. Intenta nuevamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDeactivate(token: string) {
    setError(null);
    setDeactivatingToken(token);
    try {
      await cohortService.deactivateInvitation(token);
      setInvitations((prev) => prev.map((inv) => (inv.token === token ? { ...inv, isActive: false } : inv)));
    } catch {
      setError("No se pudo desactivar la invitación. Intenta nuevamente.");
    } finally {
      setDeactivatingToken(null);
    }
  }

  if (loadState === "loading") return <LoadingState label="Cargando cohorte…" />;
  if (loadState === "not_found") return <EmptyState title="Esta cohorte no existe" description="Regresa a la lista de cohortes para elegir una disponible." action={<Button as={Link} href="/admin">Volver a cohortes</Button>} />;
  if (loadState === "error" || !cohort) return <EmptyState title="No fue posible cargar la cohorte" description="Actualiza la página para volver a intentarlo." action={<Button as={Link} href="/admin" variant="secondary">Volver a cohortes</Button>} />;

  return (
    <Page>
      <BackLink href="/admin">← Todas las cohortes</BackLink>
      <CohortHero>
        <Title>{cohort.name}</Title>
        <Description>{cohort.description ?? "Sin descripción."}</Description>
      </CohortHero>
      {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}

      <Card>
        <SectionHeader>
          <div><SectionTitle>Participantes</SectionTitle><Meta>{participants.length} {participants.length === 1 ? "participante" : "participantes"} en esta cohorte</Meta></div>
        </SectionHeader>
        {participants.length === 0 ? (
          <EmptyState title="Aún no hay participantes" description="Genera una invitación y compártela para que las personas puedan registrarse." />
        ) : (
          <TableScroll>
            <Table>
              <Thead><Tr><Th>Nombre</Th><Th>Correo</Th><Th>Se unió</Th><Th><span className="sr-only">Acción</span></Th></Tr></Thead>
              <Tbody>{participants.map((participant) => <Tr key={participant.id}><Td>{participant.fullName}</Td><Td>{participant.email}</Td><Td>{new Date(participant.createdAt).toLocaleDateString()}</Td><Td><Button as={Link} href={`/admin/participants/${participant.id}`} variant="secondary">Ver historial</Button></Td></Tr>)}</Tbody>
            </Table>
          </TableScroll>
        )}
      </Card>

      <Card>
        <SectionHeader>
          <div><SectionTitle>Invitaciones</SectionTitle><Meta>Crea un enlace individual para dar acceso a esta cohorte.</Meta></div>
          <div><Button onClick={() => handleGenerateInvitation("usuario")} disabled={isGenerating}>{isGenerating ? "Generando…" : "Invitar usuario"}</Button>{" "}<Button variant="secondary" onClick={() => handleGenerateInvitation("test")} disabled={isGenerating}>Invitar test</Button></div>
        </SectionHeader>
        {invitations.length === 0 ? (
          <EmptyState title="Aún no hay invitaciones" description="Genera la primera invitación para empezar a sumar participantes." />
        ) : (
          <TableScroll>
            <Table>
              <Thead><Tr><Th>Enlace</Th><Th>Tipo</Th><Th>Estado</Th><Th>Creada</Th><Th><span className="sr-only">Acción</span></Th></Tr></Thead>
              <Tbody>{invitations.map((invitation) => <Tr key={invitation.id}><Td><LinkText title={`${typeof window !== "undefined" ? window.location.origin : ""}/register?token=${invitation.token}`}>{typeof window !== "undefined" ? window.location.origin : ""}/register?token={invitation.token}</LinkText></Td><Td>{invitation.intendedRole === "test" ? "Prueba" : "Usuario"}</Td><Td><Badge tone={invitation.isActive ? "success" : "neutral"}>{invitation.isActive ? "Activa" : "Inactiva"}</Badge></Td><Td>{new Date(invitation.createdAt).toLocaleDateString()}</Td><Td>{invitation.isActive && <Button variant="destructive" onClick={() => handleDeactivate(invitation.token)} disabled={deactivatingToken === invitation.token}>{deactivatingToken === invitation.token ? "Desactivando…" : "Desactivar"}</Button>}</Td></Tr>)}</Tbody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </Page>
  );
}
