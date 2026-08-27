import type { EducationEntry, EmploymentProfile, ExperienceEntry, SkillItem } from "@/domain/entities";
import type { CreateEducationEntryInput, CreateExperienceEntryInput, CreateSkillItemInput } from "@/domain/repositories";
import { axiosClient } from "./axiosClient";

export async function getEmploymentProfile(): Promise<EmploymentProfile | null> { const { data } = await axiosClient.get<EmploymentProfile | null>("/employment/profile"); return data; }
export async function addExperienceEntry(input: CreateExperienceEntryInput): Promise<ExperienceEntry> { const { data } = await axiosClient.post<ExperienceEntry>("/employment/profile/experience", input); return data; }
export async function addSkillItem(input: CreateSkillItemInput): Promise<SkillItem> { const { data } = await axiosClient.post<SkillItem>("/employment/profile/skills", input); return data; }
export async function addEducationEntry(input: CreateEducationEntryInput): Promise<EducationEntry> { const { data } = await axiosClient.post<EducationEntry>("/employment/profile/education", input); return data; }
export async function updateEmploymentProfile(input: { headline?: string; summary?: string }): Promise<EmploymentProfile> { return (await axiosClient.put<EmploymentProfile>("/employment/profile", input)).data; }
export async function updateExperienceEntry(id: string, input: Partial<CreateExperienceEntryInput>): Promise<ExperienceEntry> { return (await axiosClient.put<ExperienceEntry>(`/employment/profile/experience/${id}`, input)).data; }
export async function deleteExperienceEntry(id: string): Promise<void> { await axiosClient.delete(`/employment/profile/experience/${id}`); }
export async function updateSkillItem(id: string, input: Partial<CreateSkillItemInput>): Promise<SkillItem> { return (await axiosClient.put<SkillItem>(`/employment/profile/skills/${id}`, input)).data; }
export async function deleteSkillItem(id: string): Promise<void> { await axiosClient.delete(`/employment/profile/skills/${id}`); }
export async function updateEducationEntry(id: string, input: Partial<CreateEducationEntryInput>): Promise<EducationEntry> { return (await axiosClient.put<EducationEntry>(`/employment/profile/education/${id}`, input)).data; }
export async function deleteEducationEntry(id: string): Promise<void> { await axiosClient.delete(`/employment/profile/education/${id}`); }
