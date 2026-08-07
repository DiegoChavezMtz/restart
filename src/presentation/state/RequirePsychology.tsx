"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { useAuth } from "./AuthContext";

export function RequirePsychology({ children }: { children: ReactNode }) {
  const { user, status } = useAuth(); const router = useRouter();
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.replace("/login?next=%2Fpsychology");
    else if (user?.role !== "psicologa" && user?.role !== "super_admin") router.replace("/respond");
  }, [router, status, user]);
  if (status === "loading") return <LoadingState label="Cargando área clínica…" />;
  if (user?.role !== "psicologa" && user?.role !== "super_admin") return null;
  return <>{children}</>;
}
