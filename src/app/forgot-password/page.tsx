"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardLink, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import * as authService from "@/presentation/services/authService";
import { useGuestGuard } from "@/presentation/state/useGuestGuard";

export default function ForgotPasswordPage() {
  const canRender = useGuestGuard();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(email);
      setSubmitted(true);
    } catch {
      setError("No pudimos enviar el correo en este momento. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!canRender) return null;

  if (submitted) {
    return (
      <AuthCard>
        <AuthCardBody>
          <AuthCardTitle>Revisa tu correo</AuthCardTitle>
          <FormStatusMessage variant="success">
            Si el correo existe, te enviamos un link para restablecer tu contraseña.
          </FormStatusMessage>
          <AuthCardLink href="/login">Volver a iniciar sesión</AuthCardLink>
        </AuthCardBody>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthCardBody as="form" onSubmit={handleSubmit}>
        <AuthCardTitle>Recuperar contraseña</AuthCardTitle>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar link"}
        </Button>
        <AuthCardLink href="/login">Volver a iniciar sesión</AuthCardLink>
      </AuthCardBody>
    </AuthCard>
  );
}
