"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Logo } from "@/presentation/molecules/Logo";
import { useAuth } from "@/presentation/state/AuthContext";

// First nav breakpoint in the codebase (see also 640px in AttendanceRollCall)
// — ad hoc, no shared token exists yet. Wider than that one because the desktop
// row needs room for logo + name + 4 nav links + logout button.
const NAV_BREAKPOINT = "768px";

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
  background: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.md};
  min-width: 0;
  flex: 1;
`;

const Title = styled.span`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DesktopNav = styled.nav`
  display: none;
  gap: ${(props) => props.theme.spacing.md};

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: flex;
  }
`;

const NavLink = styled(Link)`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  text-decoration: underline;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  flex-shrink: 0;
`;

const DesktopLogoutButton = styled(Button)`
  display: none;

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: inline-flex;
  }
`;

const MenuToggle = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: ${(props) => props.theme.colors.primary};
  }

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: none;
  }
`;

const MenuToggleBar = styled.span`
  width: 20px;
  height: 2px;
  border-radius: 1px;
  background: ${(props) => props.theme.colors.textPrimary};
`;

const MobileMenu = styled.div`
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: none;
  }
`;

const MobileNavLink = styled(NavLink)`
  display: block;
  padding: ${(props) => props.theme.spacing.md} ${(props) => props.theme.spacing.xl};
  text-decoration: none;
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const MobileLogoutButton = styled(Button)`
  margin: ${(props) => props.theme.spacing.md} ${(props) => props.theme.spacing.xl};
`;

const Main = styled.main`
  padding: ${(props) => props.theme.spacing.xl};
`;

const NAV_ITEMS = [
  { href: "/admin", label: "Cohortes" },
  { href: "/admin/forms", label: "Formularios" },
  { href: "/admin/attendance", label: "Asistencia" },
  { href: "/admin/stats", label: "Estadísticas" },
] as const;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Shell>
      <Header>
        <HeaderLeft>
          <Logo size="compact" />
          <Title>{user?.fullName}</Title>
        </HeaderLeft>

        <DesktopNav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </DesktopNav>

        <HeaderActions>
          <DesktopLogoutButton variant="secondary" onClick={() => logout()}>
            Cerrar sesión
          </DesktopLogoutButton>
          <MenuToggle
            type="button"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <MenuToggleBar />
            <MenuToggleBar />
            <MenuToggleBar />
          </MenuToggle>
        </HeaderActions>
      </Header>

      {isMenuOpen && (
        <MobileMenu>
          {NAV_ITEMS.map((item) => (
            <MobileNavLink key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
              {item.label}
            </MobileNavLink>
          ))}
          <MobileLogoutButton
            variant="secondary"
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
          >
            Cerrar sesión
          </MobileLogoutButton>
        </MobileMenu>
      )}

      <Main>{children}</Main>
    </Shell>
  );
}
