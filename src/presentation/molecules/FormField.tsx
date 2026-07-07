"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import { Label } from "@/presentation/atoms/Label";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string | null;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <Wrapper>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
    </Wrapper>
  );
}
