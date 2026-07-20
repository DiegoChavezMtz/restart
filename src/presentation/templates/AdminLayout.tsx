"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
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
  padding: ${(props) => props.theme.spacing.md} ${(props) => props.theme.spacing.xl};
  background: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xl};
`;

const Title = styled.span`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const Nav = styled.nav`
  display: flex;
  gap: ${(props) => props.theme.spacing.md};
`;

const NavLink = styled(Link)`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  text-decoration: underline;
`;

const Main = styled.main`
  padding: ${(props) => props.theme.spacing.xl};
`;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <Shell>
      <Header>
        <HeaderLeft>
          <Title>Panel de administrador — {user?.fullName}</Title>
          <Nav>
            <NavLink href="/admin">Cohortes</NavLink>
            <NavLink href="/admin/forms">Formularios</NavLink>
            <NavLink href="/admin/attendance">Asistencia</NavLink>
            <NavLink href="/admin/stats">Estadísticas</NavLink>
          </Nav>
        </HeaderLeft>
        <Button variant="secondary" onClick={() => logout()}>
          Cerrar sesión
        </Button>
      </Header>
      <Main>{children}</Main>
    </Shell>
  );
}
