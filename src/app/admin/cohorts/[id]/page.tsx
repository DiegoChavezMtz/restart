"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Cohort, Invitation, User } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import Link from "next/link";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 900px;
  margin-bottom: ${(props) => props.theme.spacing.xxl};
`;

const SectionTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const CohortDescription = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LinkText = styled.code`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  word-break: break-all;
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

  useEffect(() => {
    Promise.all([
      cohortService.getCohortDetail(cohortId),
      cohortService.listInvitationsByCohort(cohortId),
    ])
      .then(([detail, invitationList]) => {
        setCohort(detail.cohort);
        setParticipants(detail.participants);
        setInvitations(invitationList);
        setLoadState("loaded");
      })
      .catch((err) => {
        setLoadState(err?.response?.status === 404 ? "not_found" : "error");
      });
  }, [cohortId]);

  async function handleGenerateInvitation() {
    setIsGenerating(true);
    try {
      const invitation = await cohortService.generateInvitation(cohortId);
      setInvitations((prev) => [invitation, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDeactivate(token: string) {
    await cohortService.deactivateInvitation(token);
    setInvitations((prev) =>
      prev.map((inv) => (inv.token === token ? { ...inv, isActive: false } : inv))
    );
  }

  if (loadState === "loading") return null;

  if (loadState === "not_found") {
    return <FormStatusMessage variant="error">Esta cohorte no existe.</FormStatusMessage>;
  }

  if (loadState === "error" || !cohort) {
    return <FormStatusMessage variant="error">No se pudo cargar la cohorte.</FormStatusMessage>;
  }

  return (
    <>
      <Section>
        <Button as={Link} href={`/admin`} variant="secondary">Regresar</Button>
      </Section>
      <Section>
      <SectionTitle>{cohort.name}</SectionTitle>
        {cohort.description && <CohortDescription>{cohort.description}</CohortDescription>}
      </Section>

      <Section>
        <SectionTitle>Participantes</SectionTitle>
        <Table>
          <Thead>
            <Tr>
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Se unió</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {participants.map((participant) => (
              <Tr key={participant.id}>
                <Td>{participant.fullName}</Td>
                <Td>{participant.email}</Td>
                <Td>{new Date(participant.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <Button
                    as={Link}
                    href={`/admin/participants/${participant.id}`}
                    variant="secondary"
                  >
                    Ver historial
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>Invitaciones</SectionTitle>
          <Button onClick={handleGenerateInvitation} disabled={isGenerating}>
            {isGenerating ? "Generando…" : "Generar invitación"}
          </Button>
        </SectionHeader>
        <Table>
          <Thead>
            <Tr>
              <Th>Link</Th>
              <Th>Estado</Th>
              <Th>Creada</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {invitations.map((invitation) => (
              <Tr key={invitation.id}>
                <Td>
                  <LinkText>
                    {typeof window !== "undefined" ? window.location.origin : ""}/register?token=
                    {invitation.token}
                  </LinkText>
                </Td>
                <Td>
                  <Badge tone={invitation.isActive ? "success" : "neutral"}>
                    {invitation.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </Td>
                <Td>{new Date(invitation.createdAt).toLocaleDateString()}</Td>
                <Td>
                  {invitation.isActive && (
                    <Button variant="secondary" onClick={() => handleDeactivate(invitation.token)}>
                      Desactivar
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Section>
    </>
  );
}
