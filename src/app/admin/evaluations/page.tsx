"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Select } from "@/presentation/atoms/Select";
import { DateRangeField } from "@/presentation/molecules/DatePicker";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Cohort, Evaluation } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import * as evaluationService from "@/presentation/services/evaluationService";

const Page = styled.section`display:flex; flex-direction:column; gap:${p=>p.theme.spacing.xl}; max-width:1000px;`;
const Header = styled.div`display:flex; justify-content:space-between; gap:${p=>p.theme.spacing.lg}; align-items:flex-end; flex-wrap:wrap;`;
const Title = styled.h1`font-size:${p=>p.theme.typography.fontSize.xl}; color:${p=>p.theme.colors.textPrimary};`;
const Meta = styled.p`color:${p=>p.theme.colors.textSecondary}; line-height:${p=>p.theme.typography.lineHeight.relaxed};`;
const Card = styled.div`padding:${p=>p.theme.spacing.xl}; background:${p=>p.theme.colors.surface}; border:1px solid ${p=>p.theme.colors.border}; border-radius:16px;`;
const Form = styled.form`display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:${p=>p.theme.spacing.lg}; @media(max-width:640px){grid-template-columns:1fr;}`;
const Full = styled.div`grid-column:1/-1;`;
const Textarea = styled.textarea`width:100%; min-height:100px; padding:${p=>p.theme.spacing.sm} ${p=>p.theme.spacing.md}; border:1px solid ${p=>p.theme.colors.border}; border-radius:10px; background:${p=>p.theme.colors.background}; color:${p=>p.theme.colors.textPrimary}; font:inherit; resize:vertical;`;
const EvaluationCard = styled.article`display:grid; grid-template-columns:1fr auto; gap:${p=>p.theme.spacing.md}; padding:${p=>p.theme.spacing.lg}; border-top:1px solid ${p=>p.theme.colors.border}; @media(max-width:640px){grid-template-columns:1fr;}`;
const Status = styled.span<{ $archived?: boolean }>`font-size:${p=>p.theme.typography.fontSize.sm}; color:${p=>p.$archived?p.theme.colors.textTertiary:p.theme.colors.success};`;

function fmtDate(value: string) { return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }

export default function AdminEvaluationsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]); const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [cohortId, setCohortId] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const load = () => evaluationService.listEvaluations().then(data => setEvaluations(data as Evaluation[])).catch(() => setError("No se pudieron cargar las evaluaciones."));
  useEffect(() => { Promise.all([cohortService.listCohorts(), evaluationService.listEvaluations()]).then(([nextCohorts, nextEvaluations]) => { setCohorts(nextCohorts); setEvaluations(nextEvaluations as Evaluation[]); }).catch(() => setError("No se pudieron cargar los datos." )).finally(() => setLoading(false)); }, []);
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(null); if (!cohortId || !title.trim() || !start || !end) { setError("Completa título, cohorte y periodo."); return; } setSaving(true); try { await evaluationService.createEvaluation({ cohortId, title, description, periodStart:start, periodEnd:end }); setTitle("");setDescription("");setCohortId("");setStart("");setEnd(""); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la evaluación."); } finally { setSaving(false); } }
  async function archive(evaluation: Evaluation) { if (!window.confirm(`¿Archivar “${evaluation.title}”? Su historial seguirá disponible.`)) return; try { await evaluationService.archiveEvaluation(evaluation.id); await load(); } catch { setError("No se pudo archivar la evaluación."); } }
  return <Page><Header><div><Title>Evaluaciones</Title><Meta>Crea evaluaciones por cohorte y publica el resultado de cada participante.</Meta></div></Header>
    {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
    <Card><h2>Nueva evaluación</h2><Form onSubmit={submit}><FormField label="Título" htmlFor="evaluation-title"><Input id="evaluation-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} placeholder="Ej. Evaluación de empleabilidad" /></FormField><FormField label="Cohorte" htmlFor="evaluation-cohort"><Select id="evaluation-cohort" value={cohortId} onChange={e=>setCohortId(e.target.value)}><option value="">Selecciona una cohorte…</option>{cohorts.map(cohort=><option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select></FormField><Full><FormField label="Descripción" htmlFor="evaluation-description"><Textarea id="evaluation-description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Contexto o criterios de la evaluación (opcional)" /></FormField></Full><Full><FormField label="Periodo evaluado" htmlFor="evaluation-period"><DateRangeField startValue={start} endValue={end} onChange={(nextStart,nextEnd)=>{setStart(nextStart);setEnd(nextEnd);}} /></FormField></Full><Full><Button type="submit" disabled={saving}>{saving ? "Creando…" : "Crear evaluación"}</Button></Full></Form></Card>
    <Card><h2>Por cohorte</h2>{loading ? <LoadingState label="Cargando evaluaciones…" /> : evaluations.length === 0 ? <EmptyState title="Aún no hay evaluaciones" description="Crea la primera para asignarla a las personas activas de una cohorte." /> : evaluations.map(evaluation=><EvaluationCard key={evaluation.id}><div><strong>{evaluation.title}</strong><Meta>{evaluation.cohortName} · {fmtDate(evaluation.periodStart)} al {fmtDate(evaluation.periodEnd)}</Meta><Meta>{evaluation.publishedCount ?? 0} de {evaluation.assignedCount ?? 0} publicadas · <Status $archived={evaluation.status === "archived"}>{evaluation.status === "archived" ? "Archivada" : "Activa"}</Status></Meta></div><div><Button as={Link} href={`/admin/evaluations/${evaluation.id}`} variant="secondary">Gestionar</Button>{evaluation.status === "active" && <Button variant="ghost" onClick={()=>archive(evaluation)}>Archivar</Button>}</div></EvaluationCard>)}</Card>
  </Page>;
}
