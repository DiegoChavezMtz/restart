"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const NavWrap = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.xs};
  padding-bottom: ${(props) => props.theme.spacing.md};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  margin-bottom: ${(props) => props.theme.spacing.xl};
  overflow: visible;
`;

const PrimaryNav = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.xs};
`;

const DesktopExtra = styled.div`
  display: none;

  @media (min-width: 768px) {
    display: flex;
    gap: ${(props) => props.theme.spacing.xs};
  }
`;

const MoreNav = styled.div`
  position: relative;
  z-index: 20;

  @media (min-width: 768px) {
    display: none;
  }

`;

const MoreButton = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 36px;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => (props.$open ? props.theme.colors.borderStrong : "transparent")};
  border-radius: 999px;
  color: ${(props) => (props.$open ? props.theme.colors.textPrimary : props.theme.colors.textSecondary)};
  background: ${(props) => (props.$open ? props.theme.colors.surfaceElevated : "transparent")};
  font: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${(props) => props.theme.colors.textPrimary};
    background: ${(props) => props.theme.colors.surfaceHover};
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.focus};
    outline-offset: 2px;
  }
`;

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  color: ${(props) => props.theme.colors.accentCyan};
  font-size: 12px;
  transform: rotate(${(props) => (props.$open ? "180deg" : "0deg")});
  transition: transform 0.18s ease;
`;

const MoreMenu = styled.div`
  position: absolute;
  top: calc(100% + ${(props) => props.theme.spacing.sm});
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: min(272px, calc(100vw - 48px));
  padding: ${(props) => props.theme.spacing.sm};
  border: 1px solid ${(props) => props.theme.colors.borderStrong};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surfaceElevated};
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;

  &::before {
    content: "";
    position: absolute;
    top: -5px;
    left: 23px;
    width: 9px;
    height: 9px;
    border-top: 1px solid ${(props) => props.theme.colors.borderStrong};
    border-left: 1px solid ${(props) => props.theme.colors.borderStrong};
    background: ${(props) => props.theme.colors.surfaceElevated};
    transform: rotate(45deg);
  }

`;

const MenuEyebrow = styled.span`
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const MenuLink = styled(Link)<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: 10px;
  color: ${(props) => (props.$active ? props.theme.colors.textPrimary : props.theme.colors.textSecondary)};
  background: ${(props) => (props.$active ? props.theme.colors.surfaceHover : "transparent")};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: ${(props) => props.theme.colors.textPrimary};
    background: ${(props) => props.theme.colors.surfaceHover};
  }

  strong {
    font-size: ${(props) => props.theme.typography.fontSize.sm};
  }

  span {
    color: ${(props) => props.theme.colors.textTertiary};
    font-size: ${(props) => props.theme.typography.fontSize.xs};
  }

`;

const NavLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.md};
  border-radius: 999px;
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
  color: ${(props) => (props.$active ? props.theme.colors.background : props.theme.colors.textSecondary)};
  background: ${(props) => (props.$active ? props.theme.colors.primary : "transparent")};

  &:hover {
    background: ${(props) => (props.$active ? props.theme.colors.primaryHover : props.theme.colors.surfaceHover)};
    color: ${(props) => (props.$active ? props.theme.colors.background : props.theme.colors.textPrimary)};
  }
`;

const PRIMARY_ITEMS = [
  { href: "/employment", label: "Panel" },
  { href: "/employment/profile", label: "Mi perfil" },
  { href: "/employment/targets", label: "Vacantes" },
  { href: "/employment/cv", label: "Mis CVs" },
  { href: "/employment/applications", label: "Postulaciones" },
];

const MORE_ITEMS = [
  { href: "/employment/ikigai", label: "Ikigai", description: "Define lo que te mueve" },
  { href: "/employment/insights", label: "Decisiones", description: "Revisa tu avance y prioridades" },
];

export function EmploymentNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMoreOpen) return;
    function closeWhenOutside(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMoreOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMoreOpen]);

  return (
    <NavWrap aria-label="Secciones de empleabilidad">
      <PrimaryNav>
      {PRIMARY_ITEMS.map((item) => {
        const active = item.href === "/employment" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <NavLink key={item.href} href={item.href} $active={active}>
            {item.label}
          </NavLink>
        );
      })}
      </PrimaryNav>
      <DesktopExtra>
        {MORE_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return <NavLink key={item.href} href={item.href} $active={active}>{item.label}</NavLink>;
        })}
      </DesktopExtra>
      <MoreNav ref={moreRef}>
        <MoreButton
          type="button"
          $open={isMoreOpen}
          aria-expanded={isMoreOpen}
          aria-controls="employment-more-menu"
          onClick={() => setIsMoreOpen((open) => !open)}
        >
          Más <Chevron $open={isMoreOpen}>⌄</Chevron>
        </MoreButton>
        {isMoreOpen && <MoreMenu id="employment-more-menu" role="menu" aria-label="Más secciones de empleabilidad">
          <MenuEyebrow>Explora también</MenuEyebrow>
          {MORE_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <MenuLink key={item.href} href={item.href} $active={active} role="menuitem" onClick={() => setIsMoreOpen(false)}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </MenuLink>
            );
          })}
        </MoreMenu>}
      </MoreNav>
    </NavWrap>
  );
}
