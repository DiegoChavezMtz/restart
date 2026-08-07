import type { User } from "@/domain/entities";

/** Permisos organizacionales base; los permisos clínicos se validan también por RLS. */
export function isOperationalAdmin(user: User): boolean {
  return user.role === "super_admin" || user.role === "admin";
}

export function isResponseActor(user: User): boolean {
  return user.role === "usuario" || user.role === "test";
}

export function isSuperAdmin(user: User): boolean {
  return user.role === "super_admin";
}
