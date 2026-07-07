"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardLink, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import { Logo } from "@/presentation/molecules/Logo";
import { useAuth } from "@/presentation/state/AuthContext";
import * as authService from "@/presentation/services/authService";

const LogoRow = styled.div`
  display: flex;
  justify-content: center;
`;

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();
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
      setSession({ user: result.user, accessToken: result.accessToken });
      router.push(result.user.role === "admin" ? "/admin" : "/respond");
    } catch {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard>
      <AuthCardBody as="form" onSubmit={handleSubmit}>
        <LogoRow>
          <Logo />
        </LogoRow>
        <AuthCardTitle>Iniciar sesión</AuthCardTitle>
        <Input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
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
