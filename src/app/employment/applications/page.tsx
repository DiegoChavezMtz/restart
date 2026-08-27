"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";
import { Select } from "@/presentation/atoms/Select";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { DayField } from "@/presentation/molecules/DatePicker";
import { FormField } from "@/presentation/molecules/FormField";
import type { ApplicationStatus, CvVersion, JobApplication, JobTarget } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { ProcessingOverlay } from "@/presentation/molecules/ProcessingOverlay";
import { createApplication, listApplications, updateApplicationStatus } from "@/presentation/services/applicationService";
import { listCvVersions } from "@/presentation/services/cvService";
import { listJobTargets } from "@/presentation/services/jobTargetService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 1000px;
`;

const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: "Aplicado",
  response: "Respuesta",
  interview: "Entrevista",
  offer: "Oferta",
  rejected: "Rechazado",
};

const STATUS_TONE: Record<ApplicationStatus, "neutral" | "info" | "warning" | "success" | "error"> = {
  applied: "neutral",
  response: "info",
  interview: "warning",
  offer: "success",
  rejected: "error",
};

const STATUS_ORDER: ApplicationStatus[] = ["applied", "response", "interview", "offer"];

function daysSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const ModalTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: ${(props) => props.theme.spacing.sm};
`;

const EMPTY_APPLICATION_FORM = {
  jobTargetId: "",
  cvVersionId: "",
  appliedAt: new Date().toISOString().slice(0, 10),
};

export default function ApplicationsTrackerPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]); const [targets, setTargets] = useState<JobTarget[]>([]); const [cvs, setCvs] = useState<CvVersion[]>([]); const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_APPLICATION_FORM);
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { void Promise.all([listApplications(), listJobTargets(), listCvVersions()]).then(([apps, jobs, versions]) => { setApplications(apps); setTargets(jobs); setCvs(versions); }).finally(() => setLoading(false)); }, []);
  async function setStatus(id: string, status: ApplicationStatus) {
    if (busy) return;
    setBusy("Actualizando el estatus…");
    try {
      const updated = await updateApplicationStatus(id, status);
      setApplications((prev) => prev.map((a) => a.id === id ? updated : a));
    } finally {
      setBusy(null);
    }
  }

  function openModal() {
    setForm(EMPTY_APPLICATION_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function handleTargetChange(jobTargetId: string) {
    const matchingCvId = cvs.find((cv) => cv.jobTargetId === jobTargetId)?.id ?? "";
    setForm((f) => ({ ...f, jobTargetId, cvVersionId: matchingCvId }));
  }

  async function submitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !form.cvVersionId) return;
    const target = targets.find((t) => t.id === form.jobTargetId);
    if (!target) return;

    setBusy("Registrando tu postulación…");
    setFormError(null);
    try {
      const newApplication = await createApplication(form);
      setApplications((prev) => [newApplication, ...prev]);
      setModalOpen(false);
    } catch (submitError) {
      const message =
        (submitError as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (submitError instanceof Error ? submitError.message : "No se pudo registrar la postulación.");
      setFormError(message);
      console.error("createApplication payload:", form, submitError);
    } finally {
      setBusy(null);
    }
  }

  const stale = applications.filter((a) => a.status !== "offer" && a.status !== "rejected" && daysSince(a.statusUpdatedAt) >= 5);
  const cvsForSelectedTarget = cvs.filter((cv) => cv.jobTargetId === form.jobTargetId);
  if (loading) return <LoadingState label="Cargando postulaciones…" />;

  return (
    <Page>
      <Heading>
        <Title>Postulaciones</Title>
        <Subtitle>Registro de cada aplicación, su CV usado y el estatus actual.</Subtitle>
        <div>
          <Button onClick={openModal} disabled={Boolean(busy)}>Registrar postulación</Button>
        </div>
      </Heading>

      {stale.length > 0 && (
        <Badge tone="warning">
          {stale.length} postulación{stale.length > 1 ? "es" : ""} sin cambio de estatus en 5+ días
        </Badge>
      )}

      <TableScroll>
        <Table>
          <Thead>
            <Tr>
              <Th>Empresa / Puesto</Th>
              <Th>Fuente</Th>
              <Th>Tipo</Th>
              <Th>Estatus</Th>
              <Th>Cambiar estatus</Th>
              <Th><span className="sr-only">Acción</span></Th>
            </Tr>
          </Thead>
          <Tbody>
            {applications.map((app) => (
              <Tr key={app.id}>
                <Td data-label="Empresa y puesto">
                  {app.companyName}
                  <br />
                  <span style={{ opacity: 0.7 }}>{app.roleTitle}</span>
                </Td>
                <Td data-label="Fuente">{app.source}</Td>
                <Td data-label="Tipo">
                  <Badge tone={app.applicationType === "proactive" ? "info" : "neutral"}>
                    {app.applicationType === "proactive" ? "Proactiva" : "Reactiva"}
                  </Badge>
                </Td>
                <Td data-label="Estatus">
                  <Badge tone={STATUS_TONE[app.status]}>{STATUS_LABEL[app.status]}</Badge>
                  {app.status !== "offer" && app.status !== "rejected" && daysSince(app.statusUpdatedAt) >= 5 && (
                    <div>
                      <Badge tone="warning">{daysSince(app.statusUpdatedAt)} días sin cambio</Badge>
                    </div>
                  )}
                </Td>
                <Td data-label="Actualizar estatus">
                  <Select
                    aria-label={`Actualizar estatus de ${app.companyName}`}
                    value={app.status}
                    disabled={Boolean(busy)}
                    onChange={(event) => void setStatus(app.id, event.target.value as ApplicationStatus)}
                  >
                    {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                    <option value="rejected">Rechazado</option>
                  </Select>
                </Td>
                <Td data-label="Acciones">
                  {app.source === "linkedin" && (
                    <Button as={Link} href={`/employment/applications/${app.id}/outreach`} variant="secondary">
                      Contacto
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
            {applications.length === 0 && (
              <Tr>
                <Td colSpan={6} data-label="Postulaciones">
                  Aún no has registrado postulaciones. Cuando uses un CV para aplicar, regístrala aquí para darle seguimiento.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableScroll>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} ariaLabel="Registrar postulación">
        <ModalTitle>Registrar postulación</ModalTitle>
        <ModalForm onSubmit={submitApplication}>
          <FormField label="Vacante">
            <Select value={form.jobTargetId} onChange={(e) => handleTargetChange(e.target.value)}>
              <option value="">Selecciona una vacante…</option>
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.roleTitle} · {target.companyName} ({target.sourceSite})
                </option>
              ))}
            </Select>
          </FormField>
          {form.jobTargetId && (
            <FormField label="CV usado">
              {cvsForSelectedTarget.length === 0 ? (
                <Badge tone="warning">No tienes un CV generado para esta vacante — genera uno antes de registrar la postulación.</Badge>
              ) : (
                <Select value={form.cvVersionId} onChange={(e) => setForm((f) => ({ ...f, cvVersionId: e.target.value }))}>
                  {cvsForSelectedTarget.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.title}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          )}
          <FormField label="Fecha de postulación">
            <DayField value={form.appliedAt} onChange={(value) => setForm((f) => ({ ...f, appliedAt: value }))} />
          </FormField>
          <Badge tone="neutral">La postulación se registrará como reactiva. En LinkedIn podrás cambiarla a proactiva al confirmar que enviaste un mensaje.</Badge>
          {formError && (
            <FormStatusMessage variant="error" role="alert">
              {formError}
            </FormStatusMessage>
          )}
          <ModalActions>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={Boolean(busy) || !form.cvVersionId}>Registrar</Button>
          </ModalActions>
        </ModalForm>
      </Modal>
      {busy && <ProcessingOverlay message={busy} />}
    </Page>
  );
}
