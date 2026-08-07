"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Logo } from "@/presentation/molecules/Logo";
import { MuteButton } from "@/presentation/molecules/MuteButton";
import { useAuth } from "@/presentation/state/AuthContext";

const Shell = styled.div`
  min-height: 100vh;
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  font-family: ${(props) => props.theme.typography.fontFamily};
`;

const Header = styled.header`
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};
`;

const HeaderInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  width: min(100%, 1120px);
  min-height: 76px;
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing.md} ${(props) => props.theme.spacing.xl};
  padding-top: calc(${(props) => props.theme.spacing.md} + env(safe-area-inset-top));

  @media (max-width: 640px) {
    min-height: 68px;
    padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
    padding-top: calc(${(props) => props.theme.spacing.sm} + env(safe-area-inset-top));
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  flex-shrink: 0;
`;

const Welcome = styled.div`
  min-width: 0;
  margin-right: auto;
`;

const WelcomeLabel = styled.p`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
`;

const Name = styled.p`
  overflow: hidden;
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  flex-shrink: 0;

  @media (max-width: 420px) {
    > button:last-child {
      padding-right: ${(props) => props.theme.spacing.sm};
      padding-left: ${(props) => props.theme.spacing.sm};
      font-size: ${(props) => props.theme.typography.fontSize.sm};
    }
  }
`;

const Main = styled.main`
  width: min(100%, 1120px);
  min-height: calc(100vh - 76px);
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing.xxl} ${(props) => props.theme.spacing.xl};
  padding-bottom: calc(${(props) => props.theme.spacing.xxl} + env(safe-area-inset-bottom));

  @media (max-width: 640px) {
    min-height: calc(100vh - 68px);
    padding: ${(props) => props.theme.spacing.lg} ${(props) => props.theme.spacing.md};
    padding-bottom: calc(${(props) => props.theme.spacing.xl} + env(safe-area-inset-bottom));
  }
`;

export function ParticipantLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <Shell>
      <Header>
        <HeaderInner>
          <Brand href="/respond" aria-label="Restart, mis formularios">
            <Logo size="compact" />
          </Brand>
          <Welcome>
            <WelcomeLabel>Tu espacio</WelcomeLabel>
            <Name title={user?.fullName}>{user?.fullName}</Name>
          </Welcome>
          <HeaderActions>
            <MuteButton />
            <Button variant="secondary" onClick={() => logout()}>
              Salir
            </Button>
          </HeaderActions>
        </HeaderInner>
      </Header>
      <Main>{children}</Main>
    </Shell>
  );
}
