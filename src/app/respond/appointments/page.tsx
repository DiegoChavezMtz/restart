"use client";

import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Appointment, AppointmentSlot } from "@/domain/entities";
import * as appointmentService from "@/presentation/services/appointmentService";

const Page = styled.section`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.xl};max-width:1000px;`;
const Intro = styled.div`display:flex;align-items:end;justify-content:space-between;gap:${(p) => p.theme.spacing.lg};@media(max-width:700px){align-items:stretch;flex-direction:column;}`;
const Title = styled.h1`color:${(p) => p.theme.colors.textPrimary};font-size:${(p) => p.theme.typography.fontSize.xl};`;
const Subtitle = styled.p`max-width:64ch;color:${(p) => p.theme.colors.textSecondary};line-height:${(p) => p.theme.typography.lineHeight.relaxed};`;
const Card = styled.section`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.lg};padding:${(p) => p.theme.spacing.xl};border:1px solid ${(p) => p.theme.colors.border};border-radius:16px;background:${(p) => p.theme.colors.surface};@media(max-width:640px){padding:${(p) => p.theme.spacing.lg};}`;
const CardHeader = styled.div`display:flex;align-items:start;justify-content:space-between;gap:${(p) => p.theme.spacing.md};`;
const SectionTitle = styled.h2`color:${(p) => p.theme.colors.textPrimary};font-size:${(p) => p.theme.typography.fontSize.lg};`;
const Meta = styled.p`color:${(p) => p.theme.colors.textSecondary};font-size:${(p) => p.theme.typography.fontSize.sm};line-height:${(p) => p.theme.typography.lineHeight.relaxed};`;
const AppointmentHero = styled.div`display:flex;align-items:center;justify-content:space-between;gap:${(p) => p.theme.spacing.lg};padding:${(p) => p.theme.spacing.lg};border:1px solid ${(p) => p.theme.colors.border};border-radius:14px;background:${(p) => p.theme.colors.surfaceElevated};@media(max-width:640px){align-items:stretch;flex-direction:column;}`;
const SlotGrid = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:${(p) => p.theme.spacing.md};`;
const Slot = styled.article`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.md};padding:${(p) => p.theme.spacing.lg};border:1px solid ${(p) => p.theme.colors.border};border-radius:14px;background:${(p) => p.theme.colors.background};`;
const SlotTime = styled.p`color:${(p) => p.theme.colors.primary};font-size:${(p) => p.theme.typography.fontSize.lg};font-weight:${(p) => p.theme.typography.fontWeight.bold};`;
const SlotFooter = styled.div`display:flex;align-items:center;justify-content:space-between;gap:${(p) => p.theme.spacing.sm};margin-top:auto;`;

function dateLabel(value: string): string { return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date(value)); }
function timeLabel(value: string): string { return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function modalityLabel(slot: AppointmentSlot | Appointment): string { return slot.modality === "remote" ? "En línea" : "Presencial"; }

export default function ParticipantAppointmentsPage() {
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { const result = await appointmentService.getParticipantCalendar(); setSlots(result.slots); setAppointments(result.appointments); } catch { setError("No pudimos cargar la agenda. Intenta de nuevo."); } finally { setLoading(false); }
  }
  useEffect(() => {
    let mounted = true;
    appointmentService.getParticipantCalendar().then((result) => {
      if (!mounted) return;
      setSlots(result.slots);
      setAppointments(result.appointments);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setError("No pudimos cargar tu agenda. Intenta recargar la página.");
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);
  const active = useMemo(() => appointments.find((item) => item.status === "reserved" && new Date(item.endsAt) > new Date()), [appointments]);

  async function reserve(slot: AppointmentSlot) {
    setBusyId(slot.id); setError(null); setMessage(null);
    try { const appointment = await appointmentService.reserveAppointment(slot.id); setAppointments((items) => [...items, appointment]); setSlots((items) => items.filter((item) => item.id !== slot.id)); setMessage("Tu cita quedó reservada. Recibirás la invitación de Google Calendar cuando esté sincronizada."); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo reservar el espacio."); } finally { setBusyId(null); }
  }
  async function cancel() {
    if (!active) return; setBusyId(active.id); setError(null);
    try { const updated = await appointmentService.cancelAppointment(active.id); setAppointments((items) => items.map((item) => item.id === updated.id ? updated : item)); setMessage("La cita fue cancelada. Ya puedes reservar otro espacio."); await load(); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo cancelar la cita."); } finally { setBusyId(null); }
  }

  return <Page>
    <Intro><div><Title>Reserva tu cita</Title><Subtitle>Elige un espacio disponible para conversar con una persona mentora. Los horarios se muestran en hora de Ciudad de México y requieren al menos 24 horas de anticipación.</Subtitle></div></Intro>
    {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
    {message && <FormStatusMessage variant="success" role="status">{message}</FormStatusMessage>}
    {loading && <LoadingState label="Cargando agenda…" />}
    {!loading && active && <Card><CardHeader><div><SectionTitle>Tu próxima cita</SectionTitle><Meta>{dateLabel(active.startsAt)} · {timeLabel(active.startsAt)} a {timeLabel(active.endsAt)}</Meta></div><Badge tone="success">Reservada</Badge></CardHeader><AppointmentHero><div><SectionTitle>{active.appointmentTypeLabel}</SectionTitle><Meta>Con {active.mentorName} · {modalityLabel(active)}{active.locationText ? ` · ${active.locationText}` : ""}</Meta>{active.remoteMeetingUrl && <Meta>Meet: {active.remoteMeetingUrl}</Meta>}</div><Button variant="secondary" onClick={cancel} disabled={busyId === active.id}>{busyId === active.id ? "Cancelando…" : "Cancelar cita"}</Button></AppointmentHero></Card>}
    {!loading && !active && <Card><CardHeader><div><SectionTitle>Espacios disponibles</SectionTitle><Meta>Selecciona el horario que mejor te funcione.</Meta></div><Badge tone="neutral">{slots.length} disponibles</Badge></CardHeader>{slots.length === 0 ? <EmptyState title="No hay espacios disponibles" description="Vuelve más tarde para consultar nuevos horarios." /> : <SlotGrid>{slots.map((slot) => <Slot key={slot.id}><div><SlotTime>{timeLabel(slot.startsAt)} — {timeLabel(slot.endsAt)}</SlotTime><Meta>{dateLabel(slot.startsAt)}</Meta></div><Meta><strong>{slot.appointmentTypeLabel}</strong><br />{modalityLabel(slot)}{slot.locationText ? ` · ${slot.locationText}` : ""}<br />Mentor: {slot.mentorName}</Meta><SlotFooter><Badge tone="neutral">{slot.durationMinutes} min</Badge><Button onClick={() => reserve(slot)} disabled={busyId === slot.id}>{busyId === slot.id ? "Reservando…" : "Reservar"}</Button></SlotFooter></Slot>)}</SlotGrid>}</Card>}
  </Page>;
}
