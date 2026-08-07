import type { User, UserRole } from "@/domain/entities";
import { axiosClient } from "./axiosClient";

export type PsicologaCapability =
  | "manage_appointment_availability"
  | "manage_non_sensitive_appointments"
  | "manage_non_sensitive_internal_forms";

export interface ActiveCapability {
  capability: PsicologaCapability;
  granted_at: string;
  granted_by: string;
}

export async function listManagedUsers(): Promise<User[]> {
  const { data } = await axiosClient.get<User[]>("/users");
  return data;
}

export async function updateManagedUser(userId: string, input: { role?: UserRole; isActive?: boolean }): Promise<void> {
  await axiosClient.patch(`/users/${encodeURIComponent(userId)}/management`, input);
}

export async function resetManagedUserPassword(userId: string, newPassword: string): Promise<void> {
  await axiosClient.patch(`/users/${encodeURIComponent(userId)}/password`, { newPassword });
}

export async function listCapabilities(userId: string): Promise<ActiveCapability[]> {
  const { data } = await axiosClient.get<ActiveCapability[]>(`/users/${encodeURIComponent(userId)}/capabilities`);
  return data;
}

export async function setCapability(userId: string, capability: PsicologaCapability, enabled: boolean): Promise<void> {
  await axiosClient.patch(`/users/${encodeURIComponent(userId)}/capabilities`, { capability, enabled });
}
