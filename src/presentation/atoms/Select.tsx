"use client";

import styled from "styled-components";

export interface SelectProps {
  hasError?: boolean;
}

export const Select = styled.select<SelectProps>`
  width: 100%;
  min-height: 44px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding: ${(props) => props.theme.spacing.sm};
  padding-right: ${(props) => props.theme.spacing.xl};
  border-radius: 10px;
  border: 1px solid
    ${(props) => (props.hasError ? props.theme.colors.error : props.theme.colors.border)};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  color: ${(props) => props.theme.colors.textPrimary};
  background-color: ${(props) => props.theme.colors.background};
  background-image: ${(props) =>
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='${encodeURIComponent(
      props.theme.colors.textSecondary
    )}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right ${(props) => props.theme.spacing.sm} center;
  background-size: 12px 8px;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${(props) => (props.hasError ? props.theme.colors.error : props.theme.colors.primary)};
  }

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;
