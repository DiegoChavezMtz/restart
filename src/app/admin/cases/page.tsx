"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styled from "styled-components";
import type { User } from "@/domain/entities";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Select } from "@/presentation/atoms/Select";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as cases from "@/presentation/services/caseManagementService";
import * as users from "@/presentation/services/userManagementService";

const Page = styled.section`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.xl};max-width:1100px;`;
const Card = styled.section`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.lg};padding:${(p) => p.theme.spacing.xl};border:1px solid ${(p) => p.theme.colors.border};border-radius:16px;background:${(p) => p.theme.colors.surface};`;
const Grid = styled.div`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${(p) => p.theme.spacing.md};@media(max-width:640px){grid-template-columns:1fr;}`;
const Meta = styled.p`color:${(p) => p.theme.colors.textSecondary};font-size:${(p) => p.theme.typography.fontSize.sm};`;
const CaseRow = styled.div`display:flex;align-items:center;justify-content:space-between;gap:${(p) => p.theme.spacing.md};padding:${(p) => p.theme.spacing.md} 0;border-top:1px solid ${(p) => p.theme.colors.border};`;

export default function AdminCasesPage() {
  const [items, setItems] = useState<cases.OperationalCase[]>([]); const [accounts, setAccounts] = useState<User[]>([]); const [participantId, setParticipantId] = useState(""); const [psychologistId, setPsychologistId] = useState(""); const [title, setTitle] = useState(""); const [isSensitive, setIsSensitive] = useState(true); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => { Promise.all([cases.listOperationalCases(), users.listManagedUsers()]).then(([loaded, accounts]) => { setItems(loaded); setAccounts(accounts); }).catch(() => setError("No fue posible cargar la gestión de casos.")).finally(() => setLoading(false)); }, []);
  const participants = useMemo(() => accounts.filter((item) => item.role === "usuario" || item.role === "test"), [accounts]);
  const psychologists = useMemo(() => accounts.filter((item) => item.role === "psicologa" && item.isActive), [accounts]);
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); setSuccess(null); setBusy(true); try { const created = await cases.createCase({ participantId, title, isSensitive, psychologistId: psychologistId || undefined }); setTitle(""); setPsychologistId(""); setSuccess(isSensitive ? "Caso sensible creado y asignado sin exponer su contenido." : "Caso operativo creado."); if (!isSensitive) setItems((current) => [{ id: created.id, participant_id: participantId, title, status: "open", is_sensitive: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...current]); } catch (caught) { setError((caught as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo crear el caso."); } finally { setBusy(false); } }
  if (loading) return <LoadingState label="Cargando casos…" />;
  return <Page><div><h2>Casos y asignaciones</h2><Meta>La administración coordina casos sensibles, pero no puede abrir su contenido clínico.</Meta></div>{error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}{success && <FormStatusMessage variant="success">{success}</FormStatusMessage>}<Card><h3>Crear caso</h3><form onSubmit={submit}><Grid><label>Usuario<Select value={participantId} onChange={(event) => setParticipantId(event.target.value)} required><option value="">Seleccionar…</option>{participants.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.email}</option>)}</Select></label><label>Psicóloga asignada<Select value={psychologistId} onChange={(event) => setPsychologistId(event.target.value)}><option value="">Sin asignar</option>{psychologists.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</Select></label><label>Título<Input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label>Clasificación<Select value={isSensitive ? "sensitive" : "operational"} onChange={(event) => setIsSensitive(event.target.value === "sensitive")}><option value="sensitive">Sensible / clínico</option><option value="operational">Operativo no sensible</option></Select></label></Grid><Button type="submit" disabled={busy}>{busy ? "Creando…" : "Crear caso"}</Button></form></Card><Card><h3>Casos operativos no sensibles</h3>{items.length === 0 ? <EmptyState title="No hay casos operativos" description="Los casos sensibles se administran sin mostrarse aquí." /> : items.map((item) => <CaseRow key={item.id}><div><strong>{item.title}</strong><Meta>{item.status === "open" ? "Abierto" : "Cerrado"}</Meta></div></CaseRow>)}</Card></Page>;
}
