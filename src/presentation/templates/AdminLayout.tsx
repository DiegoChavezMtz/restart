"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Logo } from "@/presentation/molecules/Logo";
import { useAuth } from "@/presentation/state/AuthContext";

const NAV_BREAKPOINT = "960px";

const Shell = styled.div`
  min-height: 100vh;
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  font-family: ${(props) => props.theme.typography.fontFamily};
`;

const SkipLink = styled.a`
  position: fixed;
  top: ${(props) => props.theme.spacing.sm};
  left: ${(props) => props.theme.spacing.sm};
  z-index: 300;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 8px;
  background: ${(props) => props.theme.colors.focus};
  color: ${(props) => props.theme.colors.background};
  transform: translateY(-140%);

  &:focus {
    transform: translateY(0);
  }
`;

const Sidebar = styled.aside`
  display: none;
  padding: ${(props) => props.theme.spacing.lg};
  border-right: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 100;
    width: 264px;
    height: 100dvh;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.xl};
    overflow-y: auto;
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  width: fit-content;
`;

const Account = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 12px;
  background: ${(props) => props.theme.colors.surface};
`;

const AccountLabel = styled.span`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const AccountName = styled.span`
  overflow: hidden;
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const NavLabel = styled.p`
  margin: 0 ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.xs};
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  color: ${(props) => (props.$active ? props.theme.colors.textPrimary : props.theme.colors.textSecondary)};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => (props.$active ? props.theme.typography.fontWeight.bold : props.theme.typography.fontWeight.medium)};
  text-decoration: none;
  background: ${(props) => (props.$active ? props.theme.colors.surfaceElevated : "transparent")};

  &:hover {
    background: ${(props) => props.theme.colors.surfaceHover};
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const SidebarFooter = styled.div`
  margin-top: auto;
`;

const MobileHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  min-height: 68px;
  padding: ${(props) => props.theme.spacing.md};
  padding-top: calc(${(props) => props.theme.spacing.md} + env(safe-area-inset-top));
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: none;
  }
`;

const MobileBrand = styled(Link)`
  display: flex;
  align-items: center;
`;

const MenuToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 10px;
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  cursor: pointer;
`;

const MobileMenu = styled.div`
  padding: ${(props) => props.theme.spacing.md};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};

  ${Nav} {
    margin-bottom: ${(props) => props.theme.spacing.md};
  }

  @media (min-width: ${NAV_BREAKPOINT}) {
    display: none;
  }
`;

const Workspace = styled.div`
  min-width: 0;

  @media (min-width: ${NAV_BREAKPOINT}) {
    min-height: 100vh;
    margin-left: 264px;
  }
`;

const PageHeader = styled.header`
  display: flex;
  align-items: end;
  min-height: 112px;
  padding: ${(props) => props.theme.spacing.xl} ${(props) => props.theme.spacing.xxl};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) {
    min-height: auto;
    padding: ${(props) => props.theme.spacing.lg} ${(props) => props.theme.spacing.md};
  }
`;

const PageTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const Eyebrow = styled.p`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const PageTitle = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize["2xl"]};
  line-height: ${(props) => props.theme.typography.lineHeight.tight};

  @media (max-width: 640px) {
    font-size: ${(props) => props.theme.typography.fontSize.xl};
  }
`;

const Main = styled.main`
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing.xxl};

  @media (max-width: 640px) {
    padding: ${(props) => props.theme.spacing.lg} ${(props) => props.theme.spacing.md};
  }
`;

const NAV_ITEMS = [
  { href: "/admin", label: "Cohortes", title: "Cohortes" },
  { href: "/admin/forms", label: "Formularios", title: "Formularios" },
  { href: "/admin/appointments", label: "Citas", title: "Citas" },
  { href: "/admin/attendance", label: "Asistencia", title: "Asistencia" },
  { href: "/admin/stats", label: "Estadísticas", title: "Estadísticas" },
  { href: "/admin/reports", label: "Reportes", title: "Reportes" },
  { href: "/admin/users", label: "Cuentas", title: "Cuentas" },
  { href: "/admin/cases", label: "Casos", title: "Casos" },
  { href: "/admin/employment-ai", label: "IA de empleo", title: "IA de empleo" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string) {
  return NAV_ITEMS.find((item) => isActive(pathname, item.href))?.title ?? "Administración";
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pageTitle = getPageTitle(pathname);

  const navigation = (onNavigate?: () => void) => (
    <Nav aria-label="Navegación principal">
      <NavLabel>Gestión</NavLabel>
      {NAV_ITEMS.filter((item) => {
        if (item.href === "/admin/employment-ai") return user?.role === "super_admin";
        return item.href !== "/admin/users" || user?.role === "admin" || user?.role === "super_admin";
      }).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <NavLink
            key={item.href}
            href={item.href}
            $active={active}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            {item.label}
          </NavLink>
        );
      })}
    </Nav>
  );

  return (
    <Shell>
      <SkipLink href="#main-content">Saltar al contenido</SkipLink>
      <Sidebar>
        <Brand href="/admin" aria-label="Restart, inicio de administración">
          <Logo />
        </Brand>
        <Account>
          <AccountLabel>Administración</AccountLabel>
          <AccountName title={user?.fullName}>{user?.fullName}</AccountName>
        </Account>
        {navigation()}
        <SidebarFooter>
          <Button variant="primary" onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </SidebarFooter>
      </Sidebar>

      <Workspace>
        <MobileHeader>
          <MobileBrand href="/admin" aria-label="Restart, inicio de administración">
            <Logo size="compact" />
          </MobileBrand>
          <MenuToggle
            type="button"
            aria-label={isMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            aria-expanded={isMenuOpen}
            aria-controls="admin-mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? "×" : "☰"}
          </MenuToggle>
        </MobileHeader>
        {isMenuOpen && (
          <MobileMenu id="admin-mobile-menu">
            {navigation(() => setIsMenuOpen(false))}
            <Button
              variant="primary"
              onClick={() => {
                setIsMenuOpen(false);
                logout();
              }}
            >
              Cerrar sesión
            </Button>
          </MobileMenu>
        )}
        <PageHeader>
          <PageTitleGroup>
            <Eyebrow>Restart · Administración</Eyebrow>
            <PageTitle>{pageTitle}</PageTitle>
          </PageTitleGroup>
        </PageHeader>
        <Main id="main-content">{children}</Main>
      </Workspace>
    </Shell>
  );
}
