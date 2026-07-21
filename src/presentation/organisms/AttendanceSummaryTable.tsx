"use client";

import { useState } from "react";
import styled, { useTheme } from "styled-components";
import { Workbook } from "exceljs";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import {
  computeCohortAttendanceSummary,
  computeUserAttendanceSummary,
} from "@/application/use-cases/attendance/ComputeAttendanceSummary";
import type { AttendanceRecord, AttendanceSession, User } from "@/domain/entities";

const LOGO_URL = "/branding/restart-logo.png";

function toArgb(hex: string): string {
  return `FF${hex.replace("#", "").toUpperCase()}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

const TableActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const TableScroll = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const SummaryTable = styled(Table)`
  min-width: 640px;
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
  cohortName?: string;
  onLoadJustificationFile: (
    sessionId: string,
    participantId: string
  ) => Promise<{ url: string; fileType: string } | null>;
}

export function AttendanceSummaryTable({
  participants,
  sessions,
  records,
  cohortName,
  onLoadJustificationFile,
}: AttendanceSummaryTableProps) {
  const theme = useTheme();
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; fileType: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const cohortSummary = computeCohortAttendanceSummary(participants, sessions, records);
  const detailUser = participants.find((p) => p.id === detailUserId) ?? null;
  const previewDay = sessions.find((d) => d.id === previewSessionId) ?? null;
  const previewRecord =
    detailUser && previewSessionId
      ? records.find((r) => r.participantId === detailUser.id && r.sessionId === previewSessionId)
      : undefined;

  const STATUS_COLOR: Record<string, string> = {
    asistio: theme.colors.success,
    retardo: theme.colors.warning,
    falta: theme.colors.error,
    justificado: theme.colors.accentPurple,
  };

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      const logoResponse = await fetch(LOGO_URL);
      if (!logoResponse.ok) throw new Error("No se pudo cargar el logo.");
      const logoBuffer = await logoResponse.arrayBuffer();

      const workbook = new Workbook();
      workbook.creator = "Restart";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Concentrado", {
        views: [{ showGridLines: false }],
      });

      const totalCols = 1 + sessions.length;
      worksheet.columns = [{ width: 26 }, ...sessions.map(() => ({ width: 14 }))];

      const bandFill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: toArgb(theme.colors.background) },
      };
      const bandRow = worksheet.getRow(1);
      bandRow.height = 46;
      for (let col = 1; col <= totalCols; col++) {
        bandRow.getCell(col).fill = bandFill;
      }

      const logoImageId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
      worksheet.addImage(logoImageId, {
        tl: { col: 0.08, row: 0.12 },
        ext: { width: 150, height: 39 },
      });

      worksheet.getRow(2).height = 8;

      const headerRow = worksheet.getRow(3);
      headerRow.values = ["Nombre", ...sessions.map((session) => formatSessionLabel(session.sessionDate))];
      headerRow.height = 22;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: toArgb(theme.colors.primary) },
        };
        cell.font = { bold: true, color: { argb: toArgb(theme.colors.background) } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: toArgb(theme.colors.border) } },
          bottom: { style: "thin", color: { argb: toArgb(theme.colors.border) } },
        };
      });
      headerRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

      participants.forEach((participant, index) => {
        const row = worksheet.getRow(4 + index);

        const nameCell = row.getCell(1);
        nameCell.value = participant.fullName;
        nameCell.font = { bold: true, color: { argb: toArgb(theme.colors.background) } };
        nameCell.alignment = { vertical: "middle", horizontal: "left" };

        sessions.forEach((session, dayIndex) => {
          const record = records.find(
            (r) => r.participantId === participant.id && r.sessionId === session.id
          );
          const cell = row.getCell(2 + dayIndex);
          cell.value = record ? STATUS_BADGE[record.status].label : "Sin registro";
          cell.font = {
            bold: Boolean(record),
            color: {
              argb: toArgb(record ? STATUS_COLOR[record.status] : theme.colors.border),
            },
          };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { bottom: { style: "thin", color: { argb: toArgb(theme.colors.border) } } };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `concentrado-asistencia${cohortName ? `-${slugify(cohortName)}` : ""}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("No se pudo generar el archivo de Excel.");
    } finally {
      setIsExporting(false);
    }
  }

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
      <TableActions>
        {exportError && <FormStatusMessage variant="error">{exportError}</FormStatusMessage>}
        <Button variant="secondary" onClick={handleExport} disabled={participants.length === 0 || isExporting}>
          {isExporting ? "Generando…" : "Exportar a Excel"}
        </Button>
      </TableActions>

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

      <TableScroll>
        <SummaryTable>
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
        </SummaryTable>
      </TableScroll>

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
