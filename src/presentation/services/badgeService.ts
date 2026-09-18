import type { BadgeAssertion, BadgeClass, Cohort } from "@/domain/entities";
import type { BadgeCandidate } from "@/domain/repositories";
import { axiosClient } from "./axiosClient";

export async function listBadgeClasses(): Promise<BadgeClass[]> {
  const { data } = await axiosClient.get<BadgeClass[]>("/admin/badges/classes");
  return data;
}

export interface CreateBadgeClassInput {
  name: string;
  description: string;
  criteria: string;
  image: File | null;
  validMonths: number | null;
}

function toBadgeClassFormData(input: CreateBadgeClassInput): FormData {
  const form = new FormData();
  form.set("name", input.name);
  form.set("description", input.description);
  form.set("criteria", input.criteria);
  if (input.validMonths !== null) form.set("validMonths", String(input.validMonths));
  if (input.image) form.set("image", input.image);
  return form;
}

export async function createBadgeClass(input: CreateBadgeClassInput): Promise<BadgeClass> {
  const { data } = await axiosClient.post<BadgeClass>("/admin/badges/classes", toBadgeClassFormData(input));
  return data;
}

export async function updateBadgeClass(
  id: string,
  input: Partial<CreateBadgeClassInput>
): Promise<BadgeClass> {
  const form = new FormData();
  if (input.name !== undefined) form.set("name", input.name);
  if (input.description !== undefined) form.set("description", input.description);
  if (input.criteria !== undefined) form.set("criteria", input.criteria);
  if (input.validMonths !== undefined && input.validMonths !== null) form.set("validMonths", String(input.validMonths));
  if (input.image) form.set("image", input.image);
  const { data } = await axiosClient.patch<BadgeClass>(`/admin/badges/classes/${encodeURIComponent(id)}`, form);
  return data;
}

export async function getCohortCandidatesForBadge(
  cohortId: string,
  badgeClassId: string
): Promise<{ cohort: Cohort; candidates: BadgeCandidate[] }> {
  const { data } = await axiosClient.get<{ cohort: Cohort; candidates: BadgeCandidate[] }>(
    `/admin/badges/cohorts/${encodeURIComponent(cohortId)}/candidates`,
    { params: { badgeClassId } }
  );
  return data;
}

export async function issueBadgeAssertions(
  badgeClassId: string,
  recipientIds: string[]
): Promise<BadgeAssertion[]> {
  const { data } = await axiosClient.post<BadgeAssertion[]>("/admin/badges/assertions", {
    badgeClassId,
    recipientIds,
  });
  return data;
}

export async function revokeBadgeAssertion(id: string): Promise<BadgeAssertion> {
  const { data } = await axiosClient.patch<BadgeAssertion>(`/admin/badges/assertions/${encodeURIComponent(id)}`);
  return data;
}

export async function listMyBadges(): Promise<Array<BadgeAssertion & { badgeClass: BadgeClass }>> {
  const { data } = await axiosClient.get<Array<BadgeAssertion & { badgeClass: BadgeClass }>>("/badges/mine");
  return data;
}
