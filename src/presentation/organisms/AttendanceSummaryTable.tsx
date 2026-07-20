"use client";

import { useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import {
  computeCohortAttendanceSummary,
  computeUserAttendanceSummary,
} from "@/application/use-cases/attendance/ComputeAttendanceSummary";
import type { AttendanceRecord, AttendanceSession, User } from "@/domain/entities";

function formatSessionLabel(sessionDate: string): string {
  const [year, month, day] = sessionDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const SummaryHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const RateCell = styled.span<{ $rate: number }>`
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  color: ${(props) =>
    props.$rate >= 80
      ? props.theme.colors.success
      : props.$rate >= 60
        ? props.theme.colors.warning
        : props.theme.colors.error};
`;

const FaltasTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: 6px;
  background: ${(props) => props.theme.colors.surfaceElevated};
  border: 1px solid ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
  pointer-events: none;
  z-index: 10;
`;

const FaltasCell = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  cursor: help;
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  color: ${(props) => props.theme.colors.error};
  border-bottom: 1px dashed ${(props) => props.theme.colors.error};

  &:hover ${FaltasTooltip}, &:focus ${FaltasTooltip} {
    opacity: 1;
    visibility: visible;
  }
`;

const DetailTitle = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const DetailDayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const DetailDayRow = styled.div`
  padding: ${(props) => props.theme.spacing.sm} 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const DetailDayHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
`;

const DayLabel = styled.span`
  color: ${(props) => props.theme.colors.textPrimary};
  text-transform: capitalize;
`;

const DetailDayActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
`;

const PreviewTitle = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const PreviewSubtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  text-transform: capitalize;
`;

const PreviewLabel = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  margin-bottom: ${(props) => props.theme.spacing.xs};
`;

const PreviewDescription = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 360px;
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const PreviewFileLink = styled.a`
  color: ${(props) => props.theme.colors.accentCyan};
`;

const STATUS_BADGE: Record<string, { label: string; tone: "success" | "warning" | "error" | "info" }> = {
  asistio: { label: "Asistió", tone: "success" },
  retardo: { label: "Retardo", tone: "warning" },
  falta: { label: "Falta", tone: "error" },
  justificado: { label: "Justificado", tone: "info" },
};

export interface AttendanceSummaryTableProps {
  participants: User[];
  sessions: AttendanceSession[];
  records: AttendanceRecord[];
  onLoadJustificationFile: (
    sessionId: string,
    participantId: string
  ) => Promise<{ url: string; fileType: string } | null>;
}

export function AttendanceSummaryTable({
  participants,
  sessions,
  records,
  onLoadJustificationFile,
}: AttendanceSummaryTableProps) {
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; fileType: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const cohortSummary = computeCohortAttendanceSummary(participants, sessions, records);
  const detailUser = participants.find((p) => p.id === detailUserId) ?? null;
  const previewDay = sessions.find((d) => d.id === previewSessionId) ?? null;
  const previewRecord =
    detailUser && previewSessionId
      ? records.find((r) => r.participantId === detailUser.id && r.sessionId === previewSessionId)
      : undefined;

  function openPreview(sessionId: string) {
    if (!detailUserId) return;
    setPreviewSessionId(sessionId);
    setPreviewFile(null);
    setPreviewError(false);
    setPreviewLoading(true);
    onLoadJustificationFile(sessionId, detailUserId)
      .then(setPreviewFile)
      .catch(() => setPreviewError(true))
      .finally(() => setPreviewLoading(false));
  }

  return (
    <>
      <SummaryHeader>
        <Badge>{cohortSummary.totalSessions} sesiones registradas</Badge>
        <Badge tone="success">{cohortSummary.averageAttendanceRate}% asistencia promedio</Badge>
        <Badge tone="warning">{cohortSummary.totalLate} retardos totales</Badge>
        <Badge tone="info">{cohortSummary.totalJustified} justificados</Badge>
        <Badge tone="error">
          {cohortSummary.totalAbsent} faltas totales
          {cohortSummary.totalDerivedAbsences > 0 &&
            ` (${cohortSummary.totalDerivedAbsences} por acumulación de retardos)`}
        </Badge>
      </SummaryHeader>

      <Table>
        <Thead>
          <Tr>
            <Th>Nombre</Th>
            <Th>Asistencias</Th>
            <Th>Retardos</Th>
            <Th>Justificados</Th>
            <Th>Faltas</Th>
            <Th>% Asistencia</Th>
            <Th></Th>
          </Tr>
        </Thead>
        <Tbody>
          {participants.map((participant) => {
            const summary = computeUserAttendanceSummary(participant.id, sessions, records);
            return (
              <Tr key={participant.id}>
                <Td>{participant.fullName}</Td>
                <Td>{summary.present}</Td>
                <Td>{summary.late}</Td>
                <Td>{summary.justified}</Td>
                <Td>
                  <FaltasCell
                    tabIndex={0}
                    aria-label={`Faltas normales: ${summary.absent}. Faltas por retardo acumulado: ${summary.derivedAbsences}.`}
                  >
                    {summary.effectiveAbsent}
                    <FaltasTooltip>
                      Normales: {summary.absent} · Por retardo: {summary.derivedAbsences}
                    </FaltasTooltip>
                  </FaltasCell>
                </Td>
                <Td>
                  <RateCell $rate={summary.attendanceRate}>{summary.attendanceRate}%</RateCell>
                </Td>
                <Td>
                  <Button variant="secondary" onClick={() => setDetailUserId(participant.id)}>
                    Ver detalle
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      <Modal
        open={detailUser !== null}
        onClose={() => {
          setDetailUserId(null);
          setPreviewSessionId(null);
        }}
      >
        {detailUser && (
          <>
            <DetailTitle>{detailUser.fullName}</DetailTitle>
            <DetailDayList>
              {sessions.map((session) => {
                const record = records.find(
                  (r) => r.participantId === detailUser.id && r.sessionId === session.id
                );
                const badge = record ? STATUS_BADGE[record.status] : null;
                return (
                  <DetailDayRow key={session.id}>
                    <DetailDayHeader>
                      <DayLabel>{formatSessionLabel(session.sessionDate)}</DayLabel>
                      <DetailDayActions>
                        {record?.status === "justificado" && record.justification && (
                          <Button variant="secondary" onClick={() => openPreview(session.id)}>
                            Ver justificación
                          </Button>
                        )}
                        {badge ? (
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        ) : (
                          <Badge>Sin registro</Badge>
                        )}
                      </DetailDayActions>
                    </DetailDayHeader>
                  </DetailDayRow>
                );
              })}
            </DetailDayList>
          </>
        )}
      </Modal>

      <Modal open={previewRecord?.justification != null} onClose={() => setPreviewSessionId(null)}>
        {previewRecord?.justification && (
          <>
            <PreviewTitle>Justificación — {detailUser?.fullName}</PreviewTitle>
            <PreviewSubtitle>{previewDay ? formatSessionLabel(previewDay.sessionDate) : ""}</PreviewSubtitle>
            <PreviewLabel>Causa</PreviewLabel>
            <PreviewDescription>{previewRecord.justification.description}</PreviewDescription>
            <PreviewLabel>Archivo adjunto</PreviewLabel>
            {previewLoading && <PreviewDescription>Cargando…</PreviewDescription>}
            {!previewLoading && previewError && (
              <PreviewDescription>No se pudo cargar el archivo.</PreviewDescription>
            )}
            {!previewLoading && !previewError && previewFile?.fileType.startsWith("image/") && (
              <PreviewImage src={previewFile.url} alt="" />
            )}
            {!previewLoading && !previewError && previewFile && !previewFile.fileType.startsWith("image/") && (
              <PreviewFileLink href={previewFile.url} target="_blank" rel="noreferrer">
                Abrir archivo
              </PreviewFileLink>
            )}
            {!previewLoading && !previewError && !previewFile && (
              <PreviewDescription>Sin archivo adjunto</PreviewDescription>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
