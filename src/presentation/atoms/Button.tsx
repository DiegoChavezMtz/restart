"use client";

import styled, { css } from "styled-components";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
}

export const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  line-height: ${(props) => props.theme.typography.lineHeight.tight};
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease,
    transform 0.15s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.focus};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${(props) =>
    props.variant === "secondary" &&
    css`
      background: ${props.theme.colors.surface};
      border-color: ${props.theme.colors.border};
      color: ${props.theme.colors.textPrimary};
      &:hover:not(:disabled) {
        background: ${props.theme.colors.surfaceHover};
        border-color: ${props.theme.colors.borderStrong};
      }
    `}
  ${(props) =>
    props.variant === "ghost" &&
    css`
      background: transparent;
      border-color: transparent;
      color: ${props.theme.colors.textSecondary};

      &:hover:not(:disabled) {
        background: ${props.theme.colors.surfaceHover};
        color: ${props.theme.colors.textPrimary};
      }
    `}
  ${(props) =>
    props.variant === "destructive" &&
    css`
      background: transparent;
      border-color: ${props.theme.colors.error};
      color: ${props.theme.colors.error};

      &:hover:not(:disabled) {
        background: color-mix(in srgb, ${props.theme.colors.error} 14%, transparent);
      }
    `}
  ${(props) =>
    (!props.variant || props.variant === "primary") &&
    css`
      background: ${props.theme.colors.primary};
      color: ${props.theme.colors.background};

      &:hover:not(:disabled) {
        background: ${props.theme.colors.primaryHover};
      }
    `}
`;
