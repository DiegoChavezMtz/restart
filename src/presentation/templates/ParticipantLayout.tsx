"use client";

import type { ReactNode } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Logo } from "@/presentation/molecules/Logo";
import { MuteButton } from "@/presentation/molecules/MuteButton";
import { useAuth } from "@/presentation/state/AuthContext";

const Shell = styled.div`
  min-height: 100vh;
  background: ${(props) => props.theme.colors.surface};
  font-family: ${(props) => props.theme.typography.fontFamily};
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md} ${(props) => props.theme.spacing.xl};
  padding-top: calc(${(props) => props.theme.spacing.md} + env(safe-area-inset-top));
  padding-left: calc(${(props) => props.theme.spacing.xl} + env(safe-area-inset-left));
  padding-right: calc(${(props) => props.theme.spacing.xl} + env(safe-area-inset-right));
  background: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
  min-width: 0;
`;

const Title = styled.span`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 50px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  flex-shrink: 0;
`;

const Main = styled.main`
  padding: ${(props) => props.theme.spacing.xl};
  padding-bottom: calc(${(props) => props.theme.spacing.xl} + env(safe-area-inset-bottom));
  padding-left: calc(${(props) => props.theme.spacing.xl} + env(safe-area-inset-left));
  padding-right: calc(${(props) => props.theme.spacing.xl} + env(safe-area-inset-right));
`;

export function ParticipantLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <Shell>
      <Header>
        <HeaderLeft>
          <Logo size="compact" />
          <Title>Hola, {user?.fullName}</Title>
        </HeaderLeft>
        <HeaderActions>
          <MuteButton />
          <Button variant="secondary" onClick={() => logout()}>
            Salir
          </Button>
        </HeaderActions>
      </Header>
      <Main>{children}</Main>
    </Shell>
  );
}
