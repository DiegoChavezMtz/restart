"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";
import { LoadingState } from "@/presentation/molecules/AsyncState";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status } = useAuth();
  const isQualityRoute = pathname.startsWith("/admin/quality");
  const hasAccess = user?.role === "admin" || user?.role === "super_admin" || (isQualityRoute && user?.role === "psicologa");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login?next=%2Fadmin");
      return;
    }
    if (!hasAccess) {
      router.replace("/respond");
    }
  }, [status, hasAccess, router]);

  if (status === "loading") return <LoadingState label="Cargando administración…" />;
  if (status !== "authenticated" || !hasAccess) return null;

  return <>{children}</>;
}
