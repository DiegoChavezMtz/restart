"use client";

import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";

const Header = styled.div`
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Instructions = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  white-space: pre-wrap;
`;

const Footer = styled.div`
  margin-top: ${(props) => props.theme.spacing.lg};
  display: flex;
  justify-content: flex-end;
`;

export interface FormInstructionsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  instructions: string;
  onStart: () => void;
}

export function FormInstructionsModal({
  open,
  onClose,
  title,
  instructions,
  onStart,
}: FormInstructionsModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <Header>
        <Title>{title}</Title>
      </Header>
      <Instructions>{instructions}</Instructions>
      <Footer>
        <Button onClick={onStart}>Iniciar formulario</Button>
      </Footer>
    </Modal>
  );
}
