"use client";

import styled from "styled-components";

export interface InputProps {
  hasError?: boolean;
}

export const Input = styled.input<InputProps>`
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: 8px;
  border: 1px solid
    ${(props) => (props.hasError ? props.theme.colors.error : props.theme.colors.border)};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};

  &:focus {
    outline: 2px solid ${(props) => props.theme.colors.primary};
    outline-offset: 1px;
  }
`;
