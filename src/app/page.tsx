"use client";

import Link from "next/link";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { useAuth } from "@/presentation/state/AuthContext";

const Main = styled.main`
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.md};
  background: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textPrimary};
  font-family: ${(props) => props.theme.typography.fontFamily};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.primary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
`;

export default function Home() {
  const { user, status, logout } = useAuth();

  return (
    <Main>
      <Title>Restart</Title>
      <Subtitle>by Dekids</Subtitle>
      {status === "loading" && <Subtitle>Cargando sesión…</Subtitle>}
      {status === "authenticated" && user && (
        <>
          <Subtitle>Hola, {user.fullName}</Subtitle>
          <Button variant="secondary" onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </>
      )}
      {status === "unauthenticated" && (
        <Button as={Link} href="/login">
          Iniciar sesión
        </Button>
      )}
    </Main>
  );
}
