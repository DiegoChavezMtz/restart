"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`;

const Panel = styled.div`
  max-width: 640px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  background: ${(props) => props.theme.colors.surfaceElevated};
  border-radius: 12px;
  padding: ${(props) => props.theme.spacing.xl};
`;

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <Overlay onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </Panel>
    </Overlay>,
    document.body
  );
}
