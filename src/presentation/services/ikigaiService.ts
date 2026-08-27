import type { IkigaiProfile } from "@/domain/entities";
import type { UpdateIkigaiProfileInput } from "@/domain/repositories";
import { axiosClient } from "./axiosClient";

export async function getIkigaiProfile(): Promise<IkigaiProfile | null> {
  const { data } = await axiosClient.get<IkigaiProfile | null>("/employment/ikigai");
  return data;
}

export async function updateIkigaiProfile(
  input: UpdateIkigaiProfileInput
): Promise<IkigaiProfile> {
  const { data } = await axiosClient.put<IkigaiProfile>("/employment/ikigai", input);
  return data;
}

export async function generateIkigaiSynthesis(input: {
  whatYouLove: string;
  whatYouAreGoodAt: string;
  whatWorldNeeds: string;
  whatYouCanBePaidFor: string;
}): Promise<{ synthesis: string }> {
  const { data } = await axiosClient.post<{ synthesis: string }>("/employment/ikigai/synthesis", input);
  return data;
}
