"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import { useAuth } from "@/presentation/state/AuthContext";
import * as authService from "@/presentation/services/authService";
import { getRoleHome } from "@/presentation/services/authNavigation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const tokenHash = searchParams.get("token_hash") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await authService.resetPassword(tokenHash, newPassword);
      setSession(result);
      router.replace(getRoleHome(result.user.role));
    } catch (requestError) {
      const code = authService.getAuthErrorCode(requestError);
      setError(
        code === "INVALID_AUTH_INPUT"
          ? "La contraseña debe tener al menos 8 caracteres."
          : "El link es inválido o expiró. Solicita uno nuevo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!tokenHash) {
    return (
      <AuthCard>
        <AuthCardBody>
          <AuthCardTitle>Link inválido</AuthCardTitle>
          <FormStatusMessage variant="error">
            Este link no es válido. Solicita uno nuevo desde &quot;Olvidé mi contraseña&quot;.
          </FormStatusMessage>
        </AuthCardBody>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthCardBody as="form" onSubmit={handleSubmit}>
        <AuthCardTitle>Nueva contraseña</AuthCardTitle>
        <Input
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="Nueva contraseña"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </AuthCardBody>
    </AuthCard>
  );
}
