"use client";

import styled from "styled-components";

export const AuthCard = styled.div`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.colors.surface};
  font-family: ${(props) => props.theme.typography.fontFamily};
`;

export const AuthCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  width: 100%;
  max-width: 360px;
  padding: ${(props) => props.theme.spacing.xl};
  border-radius: 12px;
  background: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

export const AuthCardTitle = styled.h1`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
  margin: 0;
`;

export const AuthCardLink = styled.a`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.primary};
  text-decoration: underline;
  cursor: pointer;
`;
