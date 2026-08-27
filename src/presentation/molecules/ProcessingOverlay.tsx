"use client";

import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";

// Overlay de bloqueo genérico: se muestra mientras cualquier petición de la
// página está en curso, para que sea imposible disparar una segunda antes de
// que termine. El mensaje es contextual a la acción (lo decide quien lo usa).
// z-index por encima del Modal (200) para poder aparecer también sobre un
// popup ya abierto (ej. el wizard de logros del CV).

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.lg};
  background: rgba(0, 0, 0, 0.45);
  animation: ${fadeIn} 0.15s ease;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(props) => props.theme.spacing.md};
  width: min(90vw, 320px);
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 16px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surfaceElevated};
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.28);
`;

const Spinner = styled.span`
  width: 32px;
  height: 32px;
  border: 3px solid ${(props) => props.theme.colors.borderStrong};
  border-top-color: ${(props) => props.theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Message = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

export interface ProcessingOverlayProps {
  message: string;
}

export function ProcessingOverlay({ message }: ProcessingOverlayProps) {
  return createPortal(
    <Overlay role="status" aria-live="polite" aria-busy="true">
      <Card>
        <Spinner aria-hidden="true" />
        <Message>{message}</Message>
      </Card>
    </Overlay>,
    document.body
  );
}
