"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as attendance from "@/presentation/services/participantAttendanceService";

const Page = styled.section`display:flex;flex-direction:column;gap:${p => p.theme.spacing.xl};max-width:960px;`;
const Heading = styled.div`display:flex;flex-direction:column;gap:${p => p.theme.spacing.sm};`;
const Title = styled.h1`color:${p => p.theme.colors.textPrimary};font-size:${p => p.theme.typography.fontSize.xl};`;
const Subtitle = styled.p`color:${p => p.theme.colors.textSecondary};line-height:${p => p.theme.typography.lineHeight.relaxed};`;
const Card = styled.section`display:flex;flex-direction:column;gap:${p => p.theme.spacing.lg};padding:${p => p.theme.spacing.xl};border:1px solid ${p => p.theme.colors.border};border-radius:16px;background:${p => p.theme.colors.surface};`;
const Metrics = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:${p => p.theme.spacing.md};`;
const Metric = styled.div`padding:${p => p.theme.spacing.md};border-radius:12px;background:${p => p.theme.colors.surfaceElevated};`;
const MetricValue = styled.strong`display:block;color:${p => p.theme.colors.textPrimary};font-size:${p => p.theme.typography.fontSize.xl};`;
const MetricLabel = styled.span`color:${p => p.theme.colors.textSecondary};font-size:${p => p.theme.typography.fontSize.sm};`;
const List = styled.ol`display:flex;flex-direction:column;gap:${p => p.theme.spacing.sm};margin:0;padding:0;list-style:none;`;
const Row = styled.li`display:flex;align-items:center;justify-content:space-between;gap:${p => p.theme.spacing.md};padding:${p => p.theme.spacing.md};border:1px solid ${p => p.theme.colors.border};border-radius:12px;`;
const RowDate = styled.strong`color:${p => p.theme.colors.textPrimary};`;
const Detail = styled.p`margin:${p => p.theme.spacing.xs} 0 0;color:${p => p.theme.colors.textSecondary};font-size:${p => p.theme.typography.fontSize.sm};`;

const LABELS: Record<attendance.ParticipantAttendanceStatus, string> = { asistio: "Asistió", retardo: "Retardo", falta: "Falta", justificado: "Justificada", sin_registro: "Sin registro" };
const TONES: Record<attendance.ParticipantAttendanceStatus, "success" | "warning" | "error" | "neutral"> = { asistio: "success", retardo: "warning", falta: "error", justificado: "neutral", sin_registro: "neutral" };
function dateLabel(value: string) { return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" }).format(new Date(`${value}T12:00:00`)); }

export default function ParticipantAttendancePage() {
  const [data, setData] = useState<attendance.ParticipantAttendance | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { attendance.getMyAttendance().then(setData).catch(() => setError(true)); }, []);
  if (error) return <Page><FormStatusMessage variant="error">No pudimos cargar tu asistencia. Intenta recargar la página.</FormStatusMessage></Page>;
  if (!data) return <Page><LoadingState label="Cargando tu asistencia…" /></Page>;
  if (!data.available || !data.summary) return <Page><Heading><Title>Mi asistencia</Title><Subtitle>Consulta tus registros desde julio.</Subtitle></Heading><EmptyState title="Aún no hay asistencia disponible" description="Cuando tengas una cohorte y registros de asistencia, aparecerán aquí." /></Page>;
  const { summary } = data;
  return <Page>
    <Heading><Title>Mi asistencia</Title><Subtitle>Consulta tus registros desde julio. Los días sin captura se muestran por separado y no cuentan como faltas.</Subtitle></Heading>
    <Card><Metrics><Metric><MetricValue>{summary.present}</MetricValue><MetricLabel>Asistencias</MetricLabel></Metric><Metric><MetricValue>{summary.late}</MetricValue><MetricLabel>Retardos</MetricLabel></Metric><Metric><MetricValue>{summary.absent}</MetricValue><MetricLabel>Faltas</MetricLabel></Metric><Metric><MetricValue>{summary.justified}</MetricValue><MetricLabel>Justificadas</MetricLabel></Metric></Metrics><Detail>{summary.late < 3 ? `Con ${summary.late} retardo${summary.late === 1 ? "" : "s"}, aún no se genera una falta equivalente.` : `Tus ${summary.late} retardos equivalen actualmente a ${summary.derivedAbsences} falta${summary.derivedAbsences === 1 ? "" : "s"} para el cálculo de asistencia.`}</Detail>{summary.unrecorded > 0 && <Detail>Hay {summary.unrecorded} día{summary.unrecorded === 1 ? "" : "s"} sin registro; no se consideran faltas.</Detail>}</Card>
    <Card><h2>Detalle por fecha</h2>{data.sessions.length === 0 ? <EmptyState title="No hay sesiones desde julio" description="Tus registros aparecerán cuando se pase lista." /> : <List>{data.sessions.map(session => <Row key={session.id}><div><RowDate>{dateLabel(session.date)}</RowDate>{session.justificationDescription && <Detail>{session.justificationDescription}</Detail>}</div><Badge tone={TONES[session.status]}>{LABELS[session.status]}</Badge></Row>)}</List>}</Card>
    <Button as={Link} href="/respond" variant="secondary">Volver a mis formularios</Button>
  </Page>;
}
