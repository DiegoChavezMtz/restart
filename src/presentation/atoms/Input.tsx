"use client";

import styled from "styled-components";

export interface InputProps {
  hasError?: boolean;
}

export const Input = styled.input<InputProps>`
  width: 100%;
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid
    ${(props) => (props.hasError ? props.theme.colors.error : props.theme.colors.border)};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  color: ${(props) => props.theme.colors.textPrimary};
  background: ${(props) => props.theme.colors.background};

  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &::placeholder {
    color: ${(props) => props.theme.colors.textTertiary};
  }

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.colors.borderStrong};
  }

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }
`;
