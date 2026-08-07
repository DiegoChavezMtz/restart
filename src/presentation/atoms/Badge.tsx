"use client";

import styled, { css } from "styled-components";

export interface BadgeProps {
  tone?: "success" | "error" | "neutral" | "warning" | "info";
}

export const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: 999px;
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  background: ${(props) => props.theme.colors.surfaceElevated};
  border: 1px solid ${(props) => props.theme.colors.border};

  ${(props) =>
    props.tone === "success" &&
    css`
      color: ${props.theme.colors.success};
      border-color: color-mix(in srgb, ${props.theme.colors.success} 45%, ${props.theme.colors.border});
    `}
  ${(props) =>
    props.tone === "error" &&
    css`
      color: ${props.theme.colors.error};
      border-color: color-mix(in srgb, ${props.theme.colors.error} 45%, ${props.theme.colors.border});
    `}
  ${(props) =>
    props.tone === "warning" &&
    css`
      color: ${props.theme.colors.warning};
      border-color: color-mix(in srgb, ${props.theme.colors.warning} 45%, ${props.theme.colors.border});
    `}
  ${(props) =>
    props.tone === "info" &&
    css`
      color: ${props.theme.colors.accentPurple};
      border-color: color-mix(in srgb, ${props.theme.colors.accentPurple} 45%, ${props.theme.colors.border});
    `}
  ${(props) =>
    (!props.tone || props.tone === "neutral") &&
    css`
      color: ${props.theme.colors.textSecondary};
    `}
`;
