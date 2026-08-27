"use client";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Badge } from "@/presentation/atoms/Badge";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as service from "@/presentation/services/employmentLlmAdminService";
const Page = styled.section`display:flex; flex-direction:column; gap:${p => p.theme.spacing.xl}; max-width:720px;`;
const Card = styled.div`display:flex; flex-direction:column; gap:${p => p.theme.spacing.md}; padding:${p => p.theme.spacing.xl}; border:1px solid ${p => p.theme.colors.border}; border-radius:16px; background:${p => p.theme.colors.surface};`;
export default function EmploymentAiAdminPage() { const [enabled, setEnabled] = useState<boolean | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); useEffect(() => { service.getEmploymentLlmSettings().then(x => setEnabled(x.minimaxEnabled)).catch(() => setError("No se pudo cargar la configuración.")); }, []); async function toggle() { if (enabled === null) return; setBusy(true); setError(null); try { const next = await service.setMiniMaxEnabled(!enabled); setEnabled(next.minimaxEnabled); } catch { setError("No se pudo actualizar la configuración."); } finally { setBusy(false); } } return <Page><div><h1>IA de empleabilidad</h1><p>Este interruptor detiene todas las llamadas salientes a MiniMax; el contenido ya guardado permanece disponible.</p></div><Card><Badge tone={enabled ? "success" : "error"}>{enabled ? "MiniMax activo" : "MiniMax desactivado"}</Badge><Button variant={enabled ? "destructive" : "primary"} onClick={toggle} disabled={busy || enabled === null}>{busy ? "Guardando…" : enabled ? "Desactivar IA" : "Activar IA"}</Button>{error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}</Card></Page>; }
