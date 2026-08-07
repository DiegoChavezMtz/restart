import type { Cohort, Invitation, User } from "@/domain/entities";
import { axiosClient } from "./axiosClient";

export async function listCohorts(): Promise<Cohort[]> {
  const { data } = await axiosClient.get<Cohort[]>("/cohorts");
  return data;
}

export async function createCohort(input: { name: string; description: string | null }): Promise<Cohort> {
  const { data } = await axiosClient.post<Cohort>("/cohorts", input);
  return data;
}

export async function getCohortDetail(
  cohortId: string
): Promise<{ cohort: Cohort; participants: User[] }> {
  const { data } = await axiosClient.get<{ cohort: Cohort; participants: User[] }>(
    `/cohorts/${encodeURIComponent(cohortId)}`
  );
  return data;
}

export async function listInvitationsByCohort(cohortId: string): Promise<Invitation[]> {
  const { data } = await axiosClient.get<Invitation[]>("/invitations", {
    params: { cohortId },
  });
  return data;
}

export async function generateInvitation(cohortId: string, intendedRole: "usuario" | "test" = "usuario"): Promise<Invitation> {
  const { data } = await axiosClient.post<Invitation>("/invitations", { cohortId, intendedRole });
  return data;
}

export async function deactivateInvitation(token: string): Promise<void> {
  await axiosClient.patch(`/invitations/${encodeURIComponent(token)}`);
}
