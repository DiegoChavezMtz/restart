"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "@/presentation/services/authNavigation";
import { useAuth } from "./AuthContext";

export function useGuestGuard(): boolean {
  const router = useRouter();
  const { status, user } = useAuth();

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(getRoleHome(user.role));
    }
  }, [router, status, user]);

  return status === "unauthenticated";
}
