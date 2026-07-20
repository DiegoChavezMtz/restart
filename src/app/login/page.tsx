"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardLink, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import { Logo } from "@/presentation/molecules/Logo";
import { useAuth } from "@/presentation/state/AuthContext";
import * as authService from "@/presentation/services/authService";
import { getRoleHome, getSafeNextPath } from "@/presentation/services/authNavigation";
import { useGuestGuard } from "@/presentation/state/useGuestGuard";

const LogoRow = styled.div`
  display: flex;
  justify-content: center;
`;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const canRender = useGuestGuard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authService.login(email, password);
      setSession(result);
      router.replace(getSafeNextPath(searchParams.get("next")) ?? getRoleHome(result.user.role));
    } catch (requestError) {
      const code = authService.getAuthErrorCode(requestError);
      setError(
        code === "INVALID_CREDENTIALS"
          ? "Correo o contraseña incorrectos."
          : "No pudimos iniciar sesión. Intenta nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canRender) return null;

  return (
    <AuthCard>
      <AuthCardBody as="form" onSubmit={handleSubmit}>
        <LogoRow>
          <Logo />
        </LogoRow>
        <AuthCardTitle>Iniciar sesión</AuthCardTitle>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
        <AuthCardLink href="/forgot-password">¿Olvidaste tu contraseña?</AuthCardLink>
      </AuthCardBody>
    </AuthCard>
  );
}
