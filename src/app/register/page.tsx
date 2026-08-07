"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import { useAuth } from "@/presentation/state/AuthContext";
import * as authService from "@/presentation/services/authService";
import { getRoleHome } from "@/presentation/services/authNavigation";
import { useGuestGuard } from "@/presentation/state/useGuestGuard";
import styled from "styled-components";
import { Logo } from "@/presentation/molecules/Logo";

type TokenStatus = "checking" | "valid" | "invalid";

const LogoRow = styled.div`
  display: flex;
  justify-content: center;
`;

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthCard><AuthCardBody>Validando invitación…</AuthCardBody></AuthCard>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const canRender = useGuestGuard();
  const token = searchParams.get("token") ?? "";

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? "checking" : "invalid");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authService.registerViaInvitation({ token, email, password, fullName });
      setSession(result);
      router.replace(getRoleHome(result.user.role));
    } catch (requestError) {
      const code = authService.getAuthErrorCode(requestError);
      setError(
        code === "EMAIL_ALREADY_REGISTERED"
          ? "Ya existe una cuenta con este correo."
          : code === "INVALID_AUTH_INPUT"
            ? "Revisa el nombre, correo y contraseña."
            : "No se pudo completar el registro. Intenta nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canRender || tokenStatus === "checking") return null;

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
        <FormField label="Nombre completo" htmlFor="register-name"><Input id="register-name" type="text" name="name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required /></FormField>
        <FormField label="Correo" htmlFor="register-email"><Input id="register-email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
        <FormField label="Contraseña" htmlFor="register-password"><Input id="register-password" type="password" name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></FormField>
        <FormField label="Confirmar contraseña" htmlFor="register-confirm-password"><Input id="register-confirm-password" type="password" name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></FormField>
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </AuthCardBody>
    </AuthCard>
  );
}
