"use client";

import styled from "styled-components";

export interface FormStatusMessageProps {
  variant: "error" | "success";
}

// TODO(toast): replace with a real toast system in Fase 4.
export const FormStatusMessage = styled.p<FormStatusMessageProps>`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) =>
    props.variant === "error" ? props.theme.colors.error : props.theme.colors.success};
`;
