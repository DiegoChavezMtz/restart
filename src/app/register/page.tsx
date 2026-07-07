"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import { useAuth } from "@/presentation/state/AuthContext";
import * as authService from "@/presentation/services/authService";
import styled from "styled-components";
import { Logo } from "@/presentation/molecules/Logo";

type TokenStatus = "checking" | "valid" | "invalid";

const LogoRow = styled.div`
  display: flex;
  justify-content: center;
`;  

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const token = searchParams.get("token") ?? "";

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? "checking" : "invalid");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    authService
      .validateInvitationToken(token)
      .then(() => setTokenStatus("valid"))
      .catch(() => setTokenStatus("invalid"));
  }, [token]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authService.registerViaInvitation({ token, email, password, fullName });
      setSession({ user: result.user, accessToken: result.accessToken });
      router.push(result.user.role === "admin" ? "/admin" : "/respond");
    } catch {
      setError("No se pudo completar el registro. Verifica tus datos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (tokenStatus === "checking") return null;

  if (tokenStatus === "invalid") {
    return (
      <AuthCard>
        <AuthCardBody>
          <LogoRow>
          <Logo />
        </LogoRow>
          <AuthCardTitle>Invitación inválida</AuthCardTitle>
          <FormStatusMessage variant="error">
            Este link de invitación no es válido o ya fue desactivado.
          </FormStatusMessage>
        </AuthCardBody>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthCardBody as="form" onSubmit={handleSubmit}>
        <LogoRow>
          <Logo />
        </LogoRow>
        <AuthCardTitle>Crear cuenta</AuthCardTitle>
        <Input
          type="text"
          placeholder="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
          {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </AuthCardBody>
    </AuthCard>
  );
}
