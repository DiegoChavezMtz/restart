"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { getProfileCompletionStatus } from "@/presentation/services/profileCompletionService";

// La propia pantalla del gate vive bajo /employment — se excluye a sí misma
// para no generar un ciclo de redirección.
const GATE_PATH = "/employment/complete-profile";

export function RequireCompleteEmploymentProfile({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isGatePath = pathname === GATE_PATH;
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isGatePath) return;

    let active = true;
    getProfileCompletionStatus()
      .then((result) => {
        if (!active) return;
        if (result.complete) {
          setChecked(true);
        } else {
          router.replace(`${GATE_PATH}?next=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        // Si no se pudo verificar, no bloqueamos el acceso — se comporta
        // como si estuviera completo; los endpoints reales siguen protegidos.
        if (active) setChecked(true);
      });

    return () => {
      active = false;
    };
  }, [isGatePath, pathname, router]);

  if (isGatePath) return <>{children}</>;
  if (!checked) return <LoadingState label="Verificando tu perfil…" />;
  return <>{children}</>;
}
