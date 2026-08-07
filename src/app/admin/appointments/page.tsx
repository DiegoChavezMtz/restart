"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Select } from "@/presentation/atoms/Select";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { Appointment, AppointmentFollowUp, AppointmentFormTemplate, AppointmentParticipantDetail, AppointmentSlot, Cohort } from "@/domain/entities";
import * as appointmentService from "@/presentation/services/appointmentService";
import * as cohortService from "@/presentation/services/cohortService";

const Page = styled.section`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.xl};max-width:1200px;`;
const Intro = styled.div`display:flex;align-items:end;justify-content:space-between;gap:${(p) => p.theme.spacing.lg};@media(max-width:700px){align-items:stretch;flex-direction:column;}`;
const Title = styled.h1`color:${(p) => p.theme.colors.textPrimary};font-size:${(p) => p.theme.typography.fontSize.xl};`;
const Subtitle = styled.p`max-width:70ch;color:${(p) => p.theme.colors.textSecondary};line-height:${(p) => p.theme.typography.lineHeight.relaxed};`;
const Grid = styled.div`display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.8fr);gap:${(p) => p.theme.spacing.xl};@media(max-width:960px){grid-template-columns:1fr;}`;
const Card = styled.section`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.lg};padding:${(p) => p.theme.spacing.xl};border:1px solid ${(p) => p.theme.colors.border};border-radius:16px;background:${(p) => p.theme.colors.surface};@media(max-width:640px){padding:${(p) => p.theme.spacing.lg};}`;
const CardHeader = styled.div`display:flex;align-items:start;justify-content:space-between;gap:${(p) => p.theme.spacing.md};`;
const SectionTitle = styled.h2`color:${(p) => p.theme.colors.textPrimary};font-size:${(p) => p.theme.typography.fontSize.lg};`;
const Meta = styled.p`color:${(p) => p.theme.colors.textSecondary};font-size:${(p) => p.theme.typography.fontSize.sm};line-height:${(p) => p.theme.typography.lineHeight.relaxed};`;
const Calendar = styled.div`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.sm};`;
const Day = styled.div`display:grid;grid-template-columns:130px minmax(0,1fr);gap:${(p) => p.theme.spacing.md};padding:${(p) => p.theme.spacing.md} 0;border-top:1px solid ${(p) => p.theme.colors.border};@media(max-width:620px){grid-template-columns:1fr;}`;
const DayLabel = styled.div`font-weight:${(p) => p.theme.typography.fontWeight.bold};color:${(p) => p.theme.colors.textPrimary};text-transform:capitalize;`;
const EventList = styled.div`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.sm};`;
const Event = styled.article`display:flex;align-items:center;justify-content:space-between;gap:${(p) => p.theme.spacing.md};padding:${(p) => p.theme.spacing.md};border:1px solid ${(p) => p.theme.colors.border};border-radius:12px;background:${(p) => p.theme.colors.background};@media(max-width:620px){align-items:stretch;flex-direction:column;}`;
const EventInfo = styled.div`min-width:0;`;
const EventTitle = styled.p`font-weight:${(p) => p.theme.typography.fontWeight.bold};color:${(p) => p.theme.colors.textPrimary};`;
const Actions = styled.div`display:flex;flex-wrap:wrap;gap:${(p) => p.theme.spacing.sm};`;
const Stats = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:${(p) => p.theme.spacing.sm};`;
const Stat = styled.div`padding:${(p) => p.theme.spacing.md};border-radius:12px;background:${(p) => p.theme.colors.surfaceElevated};`;
const StatValue = styled.p`font-size:${(p) => p.theme.typography.fontSize.xl};font-weight:${(p) => p.theme.typography.fontWeight.bold};color:${(p) => p.theme.colors.primary};`;
const PublishForm = styled.form`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.md};`;
const TwoColumns = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:${(p) => p.theme.spacing.md};@media(max-width:580px){grid-template-columns:1fr;}`;
const Template = styled.div`display:flex;align-items:center;justify-content:space-between;gap:${(p) => p.theme.spacing.md};padding:${(p) => p.theme.spacing.md} 0;border-bottom:1px solid ${(p) => p.theme.colors.border};`;
const FollowUpForm = styled.div`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.md};`;
const Textarea = styled.textarea`width:100%;min-height:120px;padding:${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};border:1px solid ${(p) => p.theme.colors.border};border-radius:10px;background:${(p) => p.theme.colors.background};color:${(p) => p.theme.colors.textPrimary};font:inherit;resize:vertical;`;
const FollowUpRow = styled.div`display:flex;gap:${(p) => p.theme.spacing.sm};align-items:center;`;
const FollowUpList = styled.div`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.sm};`;
const Weekdays = styled.div`display:flex;flex-wrap:wrap;gap:${(p) => p.theme.spacing.xs};`;
const DayButton = styled.button<{ $active: boolean }>`padding:${(p) => p.theme.spacing.xs} ${(p) => p.theme.spacing.sm};border:1px solid ${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.border};border-radius:999px;background:${(p) => p.$active ? p.theme.colors.primary : p.theme.colors.background};color:${(p) => p.$active ? p.theme.colors.background : p.theme.colors.textSecondary};cursor:pointer;`;
const DetailGrid = styled.div`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:${(p) => p.theme.spacing.md};@media(max-width:640px){grid-template-columns:1fr;}`;
const Timeline = styled.div`display:flex;flex-direction:column;gap:${(p) => p.theme.spacing.sm};`;

function dayLabel(value: string): string { return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "short" }).format(new Date(value)); }
function timeLabel(value: string): string { return new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status: Appointment["status"]): string { return ({ reserved: "Reservada", completed: "Completada", no_show: "No se presentó", cancelled_by_admin: "Cancelada por admin", cancelled_by_participant: "Cancelada por participante" })[status]; }
function statusTone(status: Appointment["status"]): "neutral" | "success" | "warning" | "error" { return status === "completed" ? "success" : status === "reserved" ? "warning" : status === "no_show" ? "error" : "neutral"; }

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [templates, setTemplates] = useState<AppointmentFormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState<30 | 60 | 90 | 120>(60);
  const [modality, setModality] = useState<"remote" | "in_person">("remote");
  const [locationText, setLocationText] = useState("");
  const [appointmentType, setAppointmentType] = useState("mentoria");
  const [templateTitle, setTemplateTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [followUp, setFollowUp] = useState<AppointmentFollowUp | null>(null);
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpGoal, setFollowUpGoal] = useState("");
  const [followUpCommitment, setFollowUpCommitment] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [participantDetail, setParticipantDetail] = useState<AppointmentParticipantDetail | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editTags, setEditTags] = useState("");
  const [batchStartDate, setBatchStartDate] = useState("");
  const [batchEndDate, setBatchEndDate] = useState("");
  const [batchStartTime, setBatchStartTime] = useState("09:00");
  const [batchEndTime, setBatchEndTime] = useState("13:00");
  const [batchWeekdays, setBatchWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    let mounted = true;
    Promise.all([appointmentService.getAdminCalendar(), appointmentService.listAppointmentFormTemplates(), cohortService.listCohorts()]).then(([calendar, formTemplates, cohortList]) => {
      if (!mounted) return;
      setAppointments(calendar.appointments);
      setSlots(calendar.slots);
      setTemplates(formTemplates);
      setCohorts(cohortList);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setError("No pudimos cargar el calendario administrativo.");
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!selectedAppointment) return;
    let mounted = true;
    appointmentService.getAppointmentFollowUp(selectedAppointment.id).then((value) => {
      if (!mounted) return;
      setFollowUp(value);
      setFollowUpNotes(value.notes);
    });
    appointmentService.getAppointmentParticipant(selectedAppointment.id).then((value) => {
      if (!mounted) return;
      setParticipantDetail(value);
    });
    return () => { mounted = false; };
  }, [selectedAppointment]);
  const grouped = useMemo(() => {
    const items = [...appointments, ...slots.filter((slot) => slot.status === "available").map((slot) => ({ ...slot, kind: "slot" as const }))].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return items.reduce<Record<string, (Appointment | (AppointmentSlot & { kind: "slot" }))[]>>((result, item) => { const key = new Date(item.startsAt).toISOString().slice(0, 10); (result[key] ??= []).push(item); return result; }, {});
  }, [appointments, slots]);
  const reserved = appointments.filter((item) => item.status === "reserved").length;
  const available = slots.filter((item) => item.status === "available").length;
  const completed = appointments.filter((item) => item.status === "completed").length;

  async function publish(event: FormEvent) {
    event.preventDefault(); setBusy("publish"); setError(null); setSuccess(null);
    try { const slot = await appointmentService.publishSlot({ startsAt: new Date(startsAt).toISOString(), durationMinutes: duration, modality, locationText: modality === "in_person" ? locationText : null, appointmentType, cohortIds: cohorts.map((cohort) => cohort.id) }); setSlots((items) => [...items, slot]); setStartsAt(""); setLocationText(""); setSuccess("Disponibilidad publicada para las cohortes activas."); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo publicar el espacio."); } finally { setBusy(null); }
  }
  async function setStatus(item: Appointment, status: "completed" | "no_show" | "cancelled_by_admin") {
    setBusy(item.id); setError(null);
    try { const updated = await appointmentService.setAppointmentStatus(item.id, status); setAppointments((items) => items.map((current) => current.id === updated.id ? updated : current)); setSelectedAppointment((current) => current?.id === updated.id ? updated : current); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo actualizar la cita."); } finally { setBusy(null); }
  }
  async function createTemplate(event: FormEvent) {
    event.preventDefault(); if (!templateTitle.trim()) return; setBusy("template");
    try { const template = await appointmentService.createAppointmentFormTemplate({ title: templateTitle.trim() }); setTemplates((items) => [template, ...items]); setTemplateTitle(""); setSuccess("Plantilla interna creada. Puedes configurarla desde Formularios."); } finally { setBusy(null); }
  }
  async function saveFollowUp() {
    if (!selectedAppointment || !followUp) return;
    setBusy("follow-up");
    try {
      const updated = await appointmentService.saveAppointmentFollowUp(selectedAppointment.id, {
        notes: followUpNotes,
        goals: followUpGoal.trim() ? [...followUp.goals, followUpGoal.trim()] : followUp.goals,
        commitments: followUpCommitment.trim() ? [...followUp.commitments, { description: followUpCommitment.trim(), completed: false }] : followUp.commitments,
        forms: selectedTemplateId && !followUp.forms.some((form) => form.templateId === selectedTemplateId)
          ? [...followUp.forms, { templateId: selectedTemplateId, title: templates.find((template) => template.id === selectedTemplateId)?.title ?? "Formulario interno", status: "in_progress" }]
          : followUp.forms,
      });
      setFollowUp(updated); setFollowUpGoal(""); setFollowUpCommitment(""); setSelectedTemplateId(""); setSuccess("Seguimiento guardado.");
    } catch { setError("No se pudo guardar el seguimiento."); } finally { setBusy(null); }
  }
  async function saveAppointmentDetails() {
    if (!selectedAppointment) return;
    setBusy("edit-appointment"); setError(null);
    try {
      const updated = await appointmentService.updateAppointment(selectedAppointment.id, { notes: editNotes, locationText: editLocation, tags: editTags.split(",").map((tag) => tag.trim()).filter(Boolean) });
      setAppointments((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelectedAppointment(updated);
      setSuccess("Datos operativos de la cita actualizados.");
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo editar la cita."); } finally { setBusy(null); }
  }
  function selectAppointment(item: Appointment) {
    setSelectedAppointment(item);
    setEditNotes(item.notes ?? "");
    setEditLocation(item.locationText ?? "");
    setEditTags(item.tags.map((tag) => tag.name).join(", "));
  }
  function toggleWeekday(day: number) { setBatchWeekdays((days) => days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort()); }
  async function publishBatch(event: FormEvent) {
    event.preventDefault(); setBusy("batch"); setError(null); setSuccess(null);
    try { const created = await appointmentService.publishAvailabilityPeriod({ startDate: batchStartDate, endDate: batchEndDate, weekdays: batchWeekdays, dailyStartTime: batchStartTime, dailyEndTime: batchEndTime, durationMinutes: duration, modality, locationText: modality === "in_person" ? locationText : null, appointmentType, cohortIds: cohorts.map((cohort) => cohort.id) }); setSlots((items) => [...items, ...created]); setSuccess(`${created.length} espacios publicados en el periodo.`); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo abrir el periodo."); } finally { setBusy(null); }
  }

  return <Page>
    <Intro><div><Title>Citas</Title><Subtitle>Publica tu disponibilidad, consulta la agenda y lleva el seguimiento de las sesiones.</Subtitle></div></Intro>
    {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
    {success && <FormStatusMessage variant="success" role="status">{success}</FormStatusMessage>}
    {loading ? <LoadingState label="Cargando calendario…" /> : <>
      <Stats><Stat><Meta>Reservadas</Meta><StatValue>{reserved}</StatValue></Stat><Stat><Meta>Espacios abiertos</Meta><StatValue>{available}</StatValue></Stat><Stat><Meta>Completadas</Meta><StatValue>{completed}</StatValue></Stat></Stats>
      {selectedAppointment && participantDetail && <Card><CardHeader><div><SectionTitle>Detalle del participante</SectionTitle><Meta>Información contextual para esta cita.</Meta></div><Badge tone="info">{participantDetail.cohortName}</Badge></CardHeader><DetailGrid><div><Meta><strong>Nombre</strong></Meta><EventTitle>{participantDetail.fullName}</EventTitle></div><div><Meta><strong>Correo</strong></Meta><EventTitle>{participantDetail.email}</EventTitle></div><div><Meta><strong>Ingreso</strong></Meta><Meta>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(participantDetail.joinedAt))}</Meta></div><div><Meta><strong>Asistencia</strong></Meta><Meta>{participantDetail.attendanceSummary.attended} asistencias · {participantDetail.attendanceSummary.late} retardos · {participantDetail.attendanceSummary.absent} faltas</Meta></div></DetailGrid><Timeline><Meta><strong>Timeline del participante</strong></Meta>{participantDetail.appointmentHistory.map((history) => <FollowUpRow key={history.id}><Badge tone={statusTone(history.status)}>{statusLabel(history.status)}</Badge><Meta>{dayLabel(history.startsAt)} · {history.type} · {history.mentorName}</Meta></FollowUpRow>)}</Timeline></Card>}
      {selectedAppointment && <Card><CardHeader><div><SectionTitle>Editar cita</SectionTitle><Meta>Datos operativos; la fecha, hora y modalidad no se reprograman desde aquí.</Meta></div><Badge tone="warning">Solo mentor propietario</Badge></CardHeader><FollowUpForm><FormField label="Notas operativas" htmlFor="edit-appointment-notes"><Textarea id="edit-appointment-notes" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} placeholder="Información visible para el equipo…" /></FormField>{selectedAppointment.modality === "in_person" && <FormField label="Ubicación" htmlFor="edit-appointment-location"><Input id="edit-appointment-location" value={editLocation} onChange={(event) => setEditLocation(event.target.value)} /></FormField>}<FormField label="Etiquetas" htmlFor="edit-appointment-tags"><Input id="edit-appointment-tags" value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="inicial, seguimiento" /></FormField><Button onClick={saveAppointmentDetails} disabled={busy === "edit-appointment"}>{busy === "edit-appointment" ? "Guardando…" : "Guardar cambios"}</Button></FollowUpForm></Card>}
      <Grid>
        <Card><CardHeader><div><SectionTitle>Agenda</SectionTitle><Meta>Vista consolidada de espacios y citas.</Meta></div><Badge tone="neutral">Ciudad de México</Badge></CardHeader>{Object.keys(grouped).length === 0 ? <EmptyState title="Agenda vacía" description="Publica un espacio para comenzar." /> : <Calendar>{Object.entries(grouped).map(([day, items]) => <Day key={day}><DayLabel>{dayLabel(items[0].startsAt)}</DayLabel><EventList>{items.map((item) => "kind" in item ? <Event key={item.id}><EventInfo><EventTitle>{timeLabel(item.startsAt)} · Espacio disponible</EventTitle><Meta>{item.appointmentTypeLabel} · {item.modality === "remote" ? "En línea" : item.locationText}</Meta></EventInfo><Badge tone="success">Disponible</Badge></Event> : <Event key={item.id}><EventInfo><EventTitle>{timeLabel(item.startsAt)} · {item.participantName}</EventTitle><Meta>{item.participantCohortName} · {item.appointmentTypeLabel} · {item.modality === "remote" ? "En línea" : item.locationText}</Meta></EventInfo><Actions><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge><Button variant="secondary" onClick={() => selectAppointment(item)}>Editar cita</Button>{item.status === "reserved" && <><Button variant="secondary" onClick={() => setStatus(item, "completed")} disabled={busy === item.id}>Completar</Button><Button variant="secondary" onClick={() => setStatus(item, "no_show")} disabled={busy === item.id}>No show</Button><Button variant="secondary" onClick={() => setStatus(item, "cancelled_by_admin")} disabled={busy === item.id}>Cancelar</Button></>}</Actions></Event>)}</EventList></Day>)}</Calendar>}</Card>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          <Card><div><SectionTitle>Abrir periodo en lote</SectionTitle><Meta>Genera espacios consecutivos en los días seleccionados. Cada franja tendrá la duración que elijas.</Meta></div><PublishForm onSubmit={publishBatch}><TwoColumns><FormField label="Desde" htmlFor="batch-start-date"><Input id="batch-start-date" type="date" value={batchStartDate} onChange={(event) => setBatchStartDate(event.target.value)} required /></FormField><FormField label="Hasta" htmlFor="batch-end-date"><Input id="batch-end-date" type="date" value={batchEndDate} onChange={(event) => setBatchEndDate(event.target.value)} required /></FormField></TwoColumns><FormField label="Días de la semana" htmlFor="batch-weekdays"><Weekdays>{[ [1, "Lun"], [2, "Mar"], [3, "Mié"], [4, "Jue"], [5, "Vie"], [6, "Sáb"], [0, "Dom"] ].map(([day, label]) => <DayButton type="button" key={day} $active={batchWeekdays.includes(Number(day))} onClick={() => toggleWeekday(Number(day))}>{label}</DayButton>)}</Weekdays></FormField><TwoColumns><FormField label="Hora inicial" htmlFor="batch-start-time"><Input id="batch-start-time" type="time" value={batchStartTime} onChange={(event) => setBatchStartTime(event.target.value)} required /></FormField><FormField label="Hora final" htmlFor="batch-end-time"><Input id="batch-end-time" type="time" value={batchEndTime} onChange={(event) => setBatchEndTime(event.target.value)} required /></FormField></TwoColumns><FormField label="Duración de cada franja" htmlFor="batch-duration"><Select id="batch-duration" value={duration} onChange={(event) => setDuration(Number(event.target.value) as 30 | 60 | 90 | 120)}><option value="30">30 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option></Select></FormField><Meta>Ejemplo: de 09:00 a 12:00 con franjas de 60 minutos crea 3 espacios: 09:00–10:00, 10:00–11:00 y 11:00–12:00.</Meta><Button type="submit" variant="secondary" disabled={busy === "batch"}>{busy === "batch" ? "Abriendo…" : "Abrir periodo"}</Button></PublishForm></Card>
          <Card><div><SectionTitle>Publicar disponibilidad</SectionTitle><Meta>Los espacios quedan disponibles para la cohorte demo.</Meta></div><PublishForm onSubmit={publish}><FormField label="Fecha y hora" htmlFor="slot-start"><Input id="slot-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></FormField><TwoColumns><FormField label="Duración" htmlFor="slot-duration"><Select id="slot-duration" value={duration} onChange={(event) => setDuration(Number(event.target.value) as 30 | 60 | 90 | 120)}><option value="30">30 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option><option value="120">120 minutos</option></Select></FormField><FormField label="Tipo" htmlFor="slot-type"><Select id="slot-type" value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)}><option value="mentoria">Mentoría</option><option value="orientacion_laboral">Orientación laboral</option><option value="atencion_psicologica">Atención psicológica</option></Select></FormField></TwoColumns><FormField label="Modalidad" htmlFor="slot-modality"><Select id="slot-modality" value={modality} onChange={(event) => setModality(event.target.value as "remote" | "in_person")}><option value="remote">En línea · Google Meet</option><option value="in_person">Presencial</option></Select></FormField>{modality === "in_person" && <FormField label="Ubicación" htmlFor="slot-location"><Input id="slot-location" value={locationText} onChange={(event) => setLocationText(event.target.value)} placeholder="Sede o sala" required /></FormField>}<Button type="submit" disabled={busy === "publish"}>{busy === "publish" ? "Publicando…" : "Publicar espacio"}</Button></PublishForm></Card>
          <Card><CardHeader><div><SectionTitle>Formularios internos</SectionTitle><Meta>Plantillas disponibles para el seguimiento.</Meta></div></CardHeader>{templates.map((template) => <Template key={template.id}><div><EventTitle>{template.title}</EventTitle><Meta>{template.questionCount} preguntas · {template.createdBy}</Meta></div><Badge tone="neutral">Plantilla</Badge></Template>)}<form onSubmit={createTemplate} style={{ display: "flex", gap: "8px" }}><Input aria-label="Nombre de nueva plantilla" placeholder="Nueva plantilla" value={templateTitle} onChange={(event) => setTemplateTitle(event.target.value)} /><Button type="submit" variant="secondary" disabled={busy === "template"}>Crear</Button></form></Card>
          {selectedAppointment && followUp && <Card><CardHeader><div><SectionTitle>Seguimiento · {selectedAppointment.participantName}</SectionTitle><Meta>{selectedAppointment.appointmentTypeLabel} · {dayLabel(selectedAppointment.startsAt)}</Meta></div><Badge tone={selectedAppointment.status === "completed" ? "success" : "warning"}>{statusLabel(selectedAppointment.status)}</Badge></CardHeader><FollowUpForm><FormField label="Notas privadas" htmlFor="follow-up-notes"><Textarea id="follow-up-notes" value={followUpNotes} onChange={(event) => setFollowUpNotes(event.target.value)} placeholder="Escribe notas para el equipo de mentores…" /></FormField><FollowUpList><Meta><strong>Objetivos</strong></Meta>{followUp.goals.map((goal) => <FollowUpRow key={goal}><Badge tone="neutral">Objetivo</Badge><Meta>{goal}</Meta></FollowUpRow>)}<Input aria-label="Nuevo objetivo" placeholder="Agregar objetivo" value={followUpGoal} onChange={(event) => setFollowUpGoal(event.target.value)} /></FollowUpList><FollowUpList><Meta><strong>Compromisos</strong></Meta>{followUp.commitments.map((commitment) => <FollowUpRow key={commitment.description}><Badge tone={commitment.completed ? "success" : "warning"}>{commitment.completed ? "Listo" : "Pendiente"}</Badge><Meta>{commitment.description}</Meta></FollowUpRow>)}<Input aria-label="Nuevo compromiso" placeholder="Agregar compromiso" value={followUpCommitment} onChange={(event) => setFollowUpCommitment(event.target.value)} /></FollowUpList><FormField label="Agregar plantilla a esta cita" htmlFor="follow-up-template"><Select id="follow-up-template" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)}><option value="">Seleccionar plantilla…</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</Select></FormField>{followUp.forms.map((form) => <FollowUpRow key={form.templateId}><Badge tone="info">Formulario</Badge><Meta>{form.title} · {form.status === "completed" ? "Completado" : "En progreso"}</Meta></FollowUpRow>)}<Button onClick={saveFollowUp} disabled={busy === "follow-up"}>{busy === "follow-up" ? "Guardando…" : "Guardar seguimiento"}</Button></FollowUpForm></Card>}
        </div>
      </Grid>
    </>}
  </Page>;
}
