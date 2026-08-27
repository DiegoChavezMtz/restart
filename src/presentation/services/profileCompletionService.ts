import { axiosClient } from "./axiosClient";

export type ProfileCompletionField = "fullName" | "phone" | "location";

export interface ProfileCompletionStatus {
  complete: boolean;
  missing: ProfileCompletionField[];
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string | null;
}

export async function getProfileCompletionStatus(): Promise<ProfileCompletionStatus> {
  return (await axiosClient.get<ProfileCompletionStatus>("/employment/complete-profile")).data;
}

export async function completeUserProfile(input: {
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string | null;
}): Promise<ProfileCompletionStatus> {
  return (await axiosClient.put<ProfileCompletionStatus>("/employment/complete-profile", input)).data;
}
