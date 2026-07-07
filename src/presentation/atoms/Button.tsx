"use client";

import styled, { css } from "styled-components";

export interface ButtonProps {
  variant?: "primary" | "secondary";
}

export const Button = styled.button<ButtonProps>`
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  ${(props) =>
    props.variant === "secondary"
      ? css`
          background: transparent;
          border-color: ${props.theme.colors.border};
          color: ${props.theme.colors.textPrimary};
        `
      : css`
          background: ${props.theme.colors.primary};
          color: ${props.theme.colors.background};

          &:hover:not(:disabled) {
            background: ${props.theme.colors.primaryHover};
          }
        `}
`;
