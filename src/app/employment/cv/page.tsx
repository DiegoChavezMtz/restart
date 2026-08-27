"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Modal } from "@/presentation/atoms/Modal";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import type { CvStatus, CvVersion, JobTarget } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { listCvVersions, renameCv } from "@/presentation/services/cvService";
import { listJobTargets } from "@/presentation/services/jobTargetService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 960px;
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

const STATUS_LABEL: Record<CvStatus, string> = {
  draft: "Borrador",
  quality_review: "En control de calidad",
  approved: "Aprobado",
  sent: "Enviado",
};

const STATUS_TONE: Record<CvStatus, "neutral" | "warning" | "success" | "info"> = {
  draft: "neutral",
  quality_review: "warning",
  approved: "info",
  sent: "success",
};

const CvTitle = styled.span`
  display: flex;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.sm};

  @media (max-width: 767px) {
    justify-content: flex-start;
  }
`;

const RenameButton = styled(Button)`
  min-height: 40px;
  padding-right: ${(props) => props.theme.spacing.sm};
  padding-left: ${(props) => props.theme.spacing.sm};
`;

const DialogContent = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
`;

const DialogTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const DialogCopy = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.sm};

  @media (max-width: 480px) {
    flex-direction: column-reverse;

    > button {
      width: 100%;
    }
  }
`;

export default function CvLibraryPage() {
  const [cvs, setCvs] = useState<CvVersion[]>([]); const [targets, setTargets] = useState<JobTarget[]>([]); const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  useEffect(() => { void Promise.all([listCvVersions(), listJobTargets()]).then(([items, jobs]) => { setCvs(items); setTargets(jobs); }).finally(() => setLoading(false)); }, []);

  function startEditing(cv: CvVersion) {
    if (renaming) return;
    setRenameError(null);
    setEditingId(cv.id);
    setTitleDraft(cv.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setTitleDraft("");
    setRenameError(null);
  }

  async function saveTitle(event: React.FormEvent) {
    event.preventDefault();
    const id = editingId;
    if (renaming || !id || !titleDraft.trim()) return;
    setRenaming(true);
    try {
      const updated = await renameCv(id, titleDraft.trim());
      setCvs((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setEditingId(null);
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : "No se pudo guardar el nuevo nombre. Inténtalo de nuevo.");
    } finally {
      setRenaming(false);
    }
  }

  if (loading) return <LoadingState label="Cargando tus CVs…" />;
  return (
    <Page>
      <Heading>
        <Title>Mis CVs</Title>
        <Subtitle>Cada versión queda ligada a la vacante para la que se generó — puedes usarla como punto de partida para una nueva.</Subtitle>
      </Heading>

      <TableScroll>
        <Table>
          <Thead>
            <Tr>
              <Th>Versión</Th>
              <Th>Vacante</Th>
              <Th>Estatus</Th>
              <Th><span className="sr-only">Acción</span></Th>
            </Tr>
          </Thead>
          <Tbody>
            {cvs.map((cv) => {
              const target = targets.find((t) => t.id === cv.jobTargetId);
              return (
                <Tr key={cv.id}>
                  <Td data-label="Versión">
                    <CvTitle>{cv.title}</CvTitle>
                  </Td>
                  <Td data-label="Vacante">{target ? `${target.roleTitle} · ${target.companyName}` : "—"}</Td>
                  <Td data-label="Estatus"><Badge tone={STATUS_TONE[cv.status]}>{STATUS_LABEL[cv.status]}</Badge></Td>
                  <Td data-label="Acciones">
                    <ActionGroup>
                      <Button as={Link} href={`/employment/cv/${cv.id}/build`} variant="secondary">Editar CV</Button>
                      <RenameButton variant="ghost" onClick={() => startEditing(cv)} aria-label={`Renombrar ${cv.title}`}>✎ Renombrar</RenameButton>
                    </ActionGroup>
                  </Td>
                </Tr>
              );
            })}
            {cvs.length === 0 && (
              <Tr>
                <Td colSpan={4} data-label="Mis CVs">
                  Aún no tienes CVs. Analiza una vacante y elige la experiencia que quieres usar para crear el primero.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableScroll>
      <Modal open={Boolean(editingId)} onClose={cancelEditing} ariaLabel="Renombrar CV">
        <DialogContent onSubmit={(event) => void saveTitle(event)}>
          <div>
            <DialogTitle>Renombra tu CV</DialogTitle>
            <DialogCopy>Usa un nombre fácil de identificar, por ejemplo: “CV — Desarrollador full stack · Lexicon”.</DialogCopy>
          </div>
          <FormField label="Nombre de la versión">
            <Input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} disabled={renaming} autoFocus />
          </FormField>
          {renameError && <FormStatusMessage variant="error" role="alert">{renameError}</FormStatusMessage>}
          <DialogActions>
            <Button type="button" variant="ghost" onClick={cancelEditing} disabled={renaming}>Cancelar</Button>
            <Button type="submit" disabled={renaming || !titleDraft.trim()}>{renaming ? "Guardando…" : "Guardar nombre"}</Button>
          </DialogActions>
        </DialogContent>
      </Modal>
    </Page>
  );
}
