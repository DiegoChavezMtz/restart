"use client";

import styled, { css } from "styled-components";

export interface BadgeProps {
  tone?: "success" | "error" | "neutral" | "warning";
}

export const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  padding: 2px ${(props) => props.theme.spacing.sm};
  border-radius: 999px;
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  background: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};

  ${(props) =>
    props.tone === "success" &&
    css`
      color: ${props.theme.colors.success};
    `}
  ${(props) =>
    props.tone === "error" &&
    css`
      color: ${props.theme.colors.error};
    `}
  ${(props) =>
    props.tone === "warning" &&
    css`
      color: ${props.theme.colors.warning};
    `}
  ${(props) =>
    (!props.tone || props.tone === "neutral") &&
    css`
      color: ${props.theme.colors.textSecondary};
    `}
`;
