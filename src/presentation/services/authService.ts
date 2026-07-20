import type { User } from "@/domain/entities";
import { axiosClient } from "./axiosClient";

export interface LoginResult {
  accessToken: string;
  expiresAt: number;
  user: User;
}

export interface ApiErrorPayload {
  error?: string;
  code?: string;
}

export function getAuthErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("response" in error)) return null;
  const response = (error as { response?: { data?: ApiErrorPayload } }).response;
  return response?.data?.code ?? null;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await axiosClient.post<LoginResult>("/auth/login", { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await axiosClient.post("/auth/logout");
}

export async function requestPasswordReset(email: string): Promise<void> {
  await axiosClient.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<LoginResult> {
  const { data } = await axiosClient.post<LoginResult>("/auth/reset-password", {
    token,
    newPassword,
  });
  return data;
}

export async function refresh(): Promise<LoginResult> {
  const { data } = await axiosClient.post<LoginResult>("/auth/refresh");
  return data;
}

export async function registerViaInvitation(input: {
  token: string;
  email: string;
  password: string;
  fullName: string;
}): Promise<LoginResult> {
  const { data } = await axiosClient.post<LoginResult>("/auth/register", input);
  return data;
}

export async function validateInvitationToken(token: string): Promise<{ cohortId: string }> {
  const { data } = await axiosClient.get<{ cohortId: string }>(
    `/invitations/${encodeURIComponent(token)}`
  );
  return data;
}
