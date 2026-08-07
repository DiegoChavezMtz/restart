"use client";

import styled from "styled-components";

export interface FormStatusMessageProps {
  variant: "error" | "success";
}

// TODO(toast): replace with a real toast system in Fase 4.
export const FormStatusMessage = styled.p<FormStatusMessageProps>`
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border: 1px solid
    ${(props) => (props.variant === "error" ? props.theme.colors.error : props.theme.colors.success)};
  border-radius: 10px;
  background: ${(props) => props.theme.colors.surfaceElevated};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) =>
    props.variant === "error" ? props.theme.colors.error : props.theme.colors.success};
`;
