"use client";

import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Description = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

export interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  isConfirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  isConfirming = false,
  onConfirm,
  onClose,
}: ConfirmActionDialogProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={title}>
      <Content>
        <Title>{title}</Title>
        <Description>{description}</Description>
        <Actions>
          <Button variant="secondary" onClick={onClose} disabled={isConfirming}>Cancelar</Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? "Procesando…" : confirmLabel}
          </Button>
        </Actions>
      </Content>
    </Modal>
  );
}
