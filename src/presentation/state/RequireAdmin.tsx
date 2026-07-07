"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (user?.role !== "admin") {
      router.push("/");
    }
  }, [status, user, router]);

  if (status !== "authenticated" || user?.role !== "admin") return null;

  return <>{children}</>;
}
