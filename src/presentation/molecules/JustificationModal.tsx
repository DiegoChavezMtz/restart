"use client";

import { useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";
import { FormField } from "@/presentation/molecules/FormField";

const Title = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const Fields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  font-family: inherit;
  font-size: ${(props) => props.theme.typography.fontSize.md};
  resize: vertical;
`;

const FileHint = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  margin-top: ${(props) => props.theme.spacing.xs};
`;

const FilePreview = styled.img`
  max-width: 160px;
  max-height: 160px;
  margin-top: ${(props) => props.theme.spacing.sm};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${(props) => props.theme.spacing.sm};
  margin-top: ${(props) => props.theme.spacing.lg};
`;

export interface JustificationModalProps {
  open: boolean;
  participantName: string;
  dayLabel: string;
  initialDescription?: string;
  hasExistingFile?: boolean;
  hasExisting?: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (data: { description: string; file: File | null }) => void;
  onRemove: () => void;
}

// The caller must remount this with a fresh `key` each time it opens for a
// different user/day — internal state is only ever initialized once, there
// is no effect syncing it to prop changes on reopen.
export function JustificationModal({
  open,
  participantName,
  dayLabel,
  initialDescription = "",
  hasExistingFile = false,
  hasExisting = false,
  isSaving = false,
  onClose,
  onSave,
  onRemove,
}: JustificationModalProps) {
  const [description, setDescription] = useState(initialDescription);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileChange(files: FileList | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const picked = files?.[0] ?? null;
    setFile(picked);
    setPreviewUrl(picked && picked.type.startsWith("image/") ? URL.createObjectURL(picked) : null);
  }

  function handleSave() {
    if (!description.trim()) return;
    onSave({ description: description.trim(), file });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Title>Justificar — {participantName}</Title>
      <Subtitle>{dayLabel}</Subtitle>
      <Fields>
        <FormField label="Descripción">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Motivo de la justificación…"
          />
        </FormField>
        <FormField label="Archivo (PDF, PNG o JPG)">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => handleFileChange(e.target.files)}
          />
          {file && <FileHint>Archivo seleccionado: {file.name}</FileHint>}
          {!file && hasExistingFile && (
            <FileHint>Ya hay un archivo adjunto. Selecciona uno nuevo para reemplazarlo.</FileHint>
          )}
          {previewUrl && <FilePreview src={previewUrl} alt={file?.name ?? ""} />}
        </FormField>
      </Fields>
      <Footer>
        {hasExisting && (
          <Button
            variant="secondary"
            onClick={() => {
              onRemove();
              onClose();
            }}
            disabled={isSaving}
          >
            Quitar justificación
          </Button>
        )}
        <Button variant="secondary" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={!description.trim() || isSaving}>
          {isSaving ? "Guardando…" : "Guardar"}
        </Button>
      </Footer>
    </Modal>
  );
}
