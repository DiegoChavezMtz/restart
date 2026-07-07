"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { ParticipantSkillRadar } from "@/presentation/organisms/ParticipantSkillRadar";
import * as statsService from "@/presentation/services/statsService";
import type { GetParticipantHistoryResult } from "@/presentation/services/statsService";

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

const Email = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
`;

const Detail = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
`;

const AnswerRow = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
`;

const STATUS_LABEL: Record<string, string> = {
  in_progress: "En progreso",
  completed: "Completado",
};

type LoadState = "loading" | "loaded" | "error";

export default function ParticipantHistoryPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [result, setResult] = useState<GetParticipantHistoryResult | null>(null);
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);

  useEffect(() => {
    statsService
      .getParticipantHistory(userId)
      .then((data) => {
        setResult(data);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, [userId]);

  if (loadState === "loading") return null;

  if (loadState === "error" || !result) {
    return <FormStatusMessage variant="error">No se pudo cargar el historial.</FormStatusMessage>;
  }

  return (
    <>
      <Section>
        <SectionTitle>{result.participant.fullName}</SectionTitle>
        <Email>{result.participant.email}</Email>
      </Section>

      <Section>
        <SectionTitle>Historial de formularios</SectionTitle>
        <Table>
          <Thead>
            <Tr>
              <Th>Formulario</Th>
              <Th>Estado</Th>
              <Th>Enviado</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {result.history.map((entry) => (
              <Tr key={entry.response.id}>
                <Td>{entry.form.title}</Td>
                <Td>
                  <Badge tone={entry.response.status === "completed" ? "success" : "warning"}>
                    {STATUS_LABEL[entry.response.status]}
                  </Badge>
                </Td>
                <Td>
                  {entry.response.submittedAt
                    ? new Date(entry.response.submittedAt).toLocaleDateString()
                    : "—"}
                </Td>
                <Td>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setExpandedResponseId((prev) =>
                        prev === entry.response.id ? null : entry.response.id
                      )
                    }
                  >
                    {expandedResponseId === entry.response.id ? "Ocultar" : "Ver detalle"}
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Section>

      {result.history
        .filter((entry) => entry.response.id === expandedResponseId)
        .map((entry) => (
          <Section key={entry.response.id}>
            <SectionTitle>{entry.form.title} — respuestas</SectionTitle>
            <Detail>
              {entry.questions
                .sort((a, b) => a.order - b.order)
                .map((question) => {
                  const answer = entry.answers.find((a) => a.questionId === question.id);
                  return (
                    <AnswerRow key={question.id}>
                      <strong>{question.label}:</strong>{" "}
                      {answer && answer.value !== null
                        ? Array.isArray(answer.value)
                          ? answer.value.join(", ")
                          : String(answer.value)
                        : "Sin respuesta"}
                    </AnswerRow>
                  );
                })}
            </Detail>

            {entry.skillProfile && entry.skillProfile.length > 0 && (
              <>
                <SectionTitle>Perfil de habilidades</SectionTitle>
                <ParticipantSkillRadar profile={entry.skillProfile} />
              </>
            )}
          </Section>
        ))}
    </>
  );
}
