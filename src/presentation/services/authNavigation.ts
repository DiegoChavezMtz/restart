import type { UserRole } from "@/domain/entities";

export function getRoleHome(role: UserRole): string {
  if (role === "super_admin" || role === "admin") return "/admin";
  if (role === "psicologa") return "/psychology";
  return "/respond";
}

export function getSafeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://restart.local");
    if (url.origin !== "https://restart.local") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
