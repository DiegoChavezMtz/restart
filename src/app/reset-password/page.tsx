"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AuthCard, AuthCardBody, AuthCardTitle } from "@/presentation/molecules/AuthCard";
import { useAuth } from "@/presentation/state/AuthContext";
import * as authService from "@/presentation/services/authService";

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authService.resetPassword(tokenHash, newPassword);
      setSession({ user: result.user, accessToken: result.accessToken });
      router.push("/");
    } catch {
      setError("El link es inválido o expiró. Solicita uno nuevo.");
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
          placeholder="Nueva contraseña"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
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
