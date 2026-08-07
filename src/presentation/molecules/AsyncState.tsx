"use client";

import type { ReactNode } from "react";
import styled from "styled-components";

const StateCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px dashed ${(props) => props.theme.colors.borderStrong};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
`;

const Title = styled.h3`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

const Description = styled.p`
  max-width: 56ch;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  min-height: 120px;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border: 2px solid ${(props) => props.theme.colors.borderStrong};
  border-top-color: ${(props) => props.theme.colors.focus};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <LoadingWrap role="status" aria-live="polite">
      <Spinner aria-hidden="true" />
      {label}
    </LoadingWrap>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <StateCard>
      <Title>{title}</Title>
      <Description>{description}</Description>
      {action}
    </StateCard>
  );
}
