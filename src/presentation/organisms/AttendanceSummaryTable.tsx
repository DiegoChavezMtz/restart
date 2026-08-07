"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
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

type SortField = "name" | "present" | "late" | "justified" | "absent";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "name", label: "Nombre" },
  { value: "present", label: "Asistencias" },
  { value: "late", label: "Retardos" },
  { value: "justified", label: "Justificaciones" },
  { value: "absent", label: "Faltas" },
];

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

const SortControls = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
  margin-right: auto;
`;

const SortLabel = styled.label`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const SortSelect = styled.select`
  min-height: 38px;
  padding: 0 ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  font: inherit;
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
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; fileType: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const cohortSummary = computeCohortAttendanceSummary(participants, sessions, records);
  const sortedParticipants = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...participants].sort((left, right) => {
      const leftSummary = computeUserAttendanceSummary(left.id, sessions, records);
      const rightSummary = computeUserAttendanceSummary(right.id, sessions, records);
      const comparison =
        sortField === "name"
          ? left.fullName.localeCompare(right.fullName, "es-MX", { sensitivity: "base" })
          : (sortField === "present" ? leftSummary.present :
              sortField === "late" ? leftSummary.late :
              sortField === "justified" ? leftSummary.justified : leftSummary.effectiveAbsent) -
            (sortField === "present" ? rightSummary.present :
              sortField === "late" ? rightSummary.late :
              sortField === "justified" ? rightSummary.justified : rightSummary.effectiveAbsent);

      return comparison === 0
        ? left.fullName.localeCompare(right.fullName, "es-MX", { sensitivity: "base" })
        : comparison * direction;
    });
  }, [participants, records, sessions, sortDirection, sortField]);
  const detailUser = participants.find((p) => p.id === detailUserId) ?? null;
  const previewDay = sessions.find((d) => d.id === previewSessionId) ?? null;
  const previewRecord =
    detailUser && previewSessionId
      ? records.find((r) => r.participantId === detailUser.id && r.sessionId === previewSessionId)
      : undefined;

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

      const totalCols = 2 + sessions.length;
      worksheet.columns = [{ width: 7 }, { width: 34 }, ...sessions.map(() => ({ width: 18 }))];

      const excelColors = {
        black: "FF050505",
        white: "FFF5F5F5",
        red: "FFC3002F",
        border: "FF5C5C5C",
        green: "FF69BE28",
        yellow: "FFFFD500",
        absence: "FFFF0028",
        purple: "FF9B35D5",
        muted: "FFBDBDBD",
      };

      const bandFill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: excelColors.black },
      };
      const bandRow = worksheet.getRow(1);
      bandRow.height = 48;
      for (let col = 1; col <= totalCols; col++) {
        bandRow.getCell(col).fill = bandFill;
      }

      const logoImageId = workbook.addImage({ buffer: logoBuffer, extension: "png" });
      worksheet.addImage(logoImageId, {
        tl: { col: 0.08, row: 0.12 },
        ext: { width: 190, height: 42 },
      });

      if (totalCols > 3) worksheet.mergeCells(1, 3, 1, totalCols - 1);
      const titleCell = worksheet.getCell(1, 3);
      titleCell.value = {
        richText: [
          { text: "CONTROL DE ", font: { bold: true, size: 22, color: { argb: excelColors.white } } },
          { text: "ASISTENCIA", font: { bold: true, size: 22, color: { argb: excelColors.absence } } },
        ],
      };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };

      const firstDate = sessions.at(0)?.sessionDate;
      const lastDate = sessions.at(-1)?.sessionDate;
      if (totalCols > 3) {
        const periodCell = worksheet.getCell(1, totalCols);
        periodCell.value = firstDate && lastDate
          ? `${new Date(`${firstDate}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} al ${new Date(`${lastDate}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`
          : "";
        periodCell.font = { bold: true, size: 10, color: { argb: excelColors.white } };
        periodCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }

      worksheet.getRow(2).height = 10;

      const headerRow = worksheet.getRow(3);
      headerRow.values = ["#", "NOMBRE", ...sessions.map((session) => formatSessionLabel(session.sessionDate))];
      headerRow.height = 27;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelColors.red },
        };
        cell.font = { bold: true, color: { argb: excelColors.white }, size: 12 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin", color: { argb: excelColors.border } },
          bottom: { style: "thin", color: { argb: excelColors.border } },
          left: { style: "thin", color: { argb: excelColors.border } },
          right: { style: "thin", color: { argb: excelColors.border } },
        };
      });
      headerRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };

      sortedParticipants.forEach((participant, index) => {
        const row = worksheet.getRow(4 + index);
        row.height = 25;

        const numberCell = row.getCell(1);
        numberCell.value = index + 1;
        numberCell.font = { bold: true, color: { argb: excelColors.white } };
        numberCell.alignment = { vertical: "middle", horizontal: "center" };

        const nameCell = row.getCell(2);
        nameCell.value = participant.fullName;
        nameCell.font = { color: { argb: excelColors.white } };
        nameCell.alignment = { vertical: "middle", horizontal: "left" };

        sessions.forEach((session, dayIndex) => {
          const record = records.find(
            (r) => r.participantId === participant.id && r.sessionId === session.id
          );
          const cell = row.getCell(3 + dayIndex);
          cell.value = record ? STATUS_BADGE[record.status].label : "Sin registro";
          cell.font = {
            bold: Boolean(record),
            color: {
              argb: record
                ? ({ asistio: excelColors.green, retardo: excelColors.yellow, falta: excelColors.absence, justificado: excelColors.purple }[record.status])
                : excelColors.muted,
            },
          };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = bandFill;
          cell.border = {
            top: { style: "thin", color: { argb: excelColors.border } },
            bottom: { style: "thin", color: { argb: excelColors.border } },
            left: { style: "thin", color: { argb: excelColors.border } },
            right: { style: "thin", color: { argb: excelColors.border } },
          };
        });
      });

      const legendRow = worksheet.getRow(5 + sortedParticipants.length);
      legendRow.height = 26;
      const legend = [
        ["VERDE = ASISTENCIA", excelColors.green],
        ["AMARILLO = RETARDO", excelColors.yellow],
        ["ROJO = FALTA", excelColors.absence],
        ["MORADO = JUSTIFICADO", excelColors.purple],
      ];
      legend.forEach(([label, color], index) => {
        const startCol = 1 + index * Math.max(1, Math.floor(totalCols / 4));
        const cell = legendRow.getCell(startCol);
        cell.value = label;
        cell.font = { bold: true, size: 10, color: { argb: excelColors.white } };
        cell.fill = bandFill;
        cell.alignment = { vertical: "middle", horizontal: "left" };
        cell.border = { left: { style: "thick", color: { argb: color } } };
      });
      worksheet.views = [{ showGridLines: false, state: "frozen", ySplit: 3, xSplit: 2 }];

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
        <SortControls>
          <SortLabel htmlFor="attendance-sort">Ordenar por</SortLabel>
          <SortSelect id="attendance-sort" value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}>
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SortSelect>
          <Button variant="secondary" onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>
            {sortDirection === "asc" ? "Ascendente" : "Descendente"}
          </Button>
        </SortControls>
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
            {sortedParticipants.map((participant) => {
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
