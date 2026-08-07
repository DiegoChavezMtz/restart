import { ForbiddenError, FormNotFoundError, UserNotFoundError } from "@/application/errors";
import type { Answer, Form, FormResponse, Question, User } from "@/domain/entities";
import type { FormRepository, ResponseRepository, StatsRepository } from "@/domain/repositories";
import { computeFormSkillProfile, type SkillProfileEntry } from "./ComputeFormSkillProfile";

export interface ParticipantHistoryEntry {
  response: FormResponse;
  form: Form;
  questions: Question[];
  answers: Answer[];
  skillProfile: SkillProfileEntry[] | null; // null when the form has no FormSkill defined
}

export interface GetParticipantHistoryResult {
  participant: User;
  history: ParticipantHistoryEntry[];
}

export async function getParticipantHistory(
  statsRepo: StatsRepository,
  formRepo: FormRepository,
  responseRepo: ResponseRepository,
  input: { participantId: string; requestedBy: User; adminAccessToken: string }
): Promise<GetParticipantHistoryResult> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const participant = await statsRepo.getUserById(input.participantId, input.adminAccessToken);
  if (!participant) throw new UserNotFoundError();

  const responses = await statsRepo.listResponsesForParticipant(
    input.participantId,
    input.adminAccessToken
  );

  const history = await Promise.all(
    responses.map(async (response): Promise<ParticipantHistoryEntry> => {
      const [form, questions, answers, skills, weights] = await Promise.all([
        formRepo.getFormById(response.formId, input.adminAccessToken),
        formRepo.listQuestionsByForm(response.formId, input.adminAccessToken),
        responseRepo.listAnswersByResponse(response.id, input.adminAccessToken),
        formRepo.listFormSkills(response.formId, input.adminAccessToken),
        formRepo.listQuestionSkillWeightsByForm(response.formId, input.adminAccessToken),
      ]);
      if (!form) throw new FormNotFoundError();

      const skillProfile =
        skills.length > 0 ? computeFormSkillProfile(questions, answers, skills, weights) : null;

      return { response, form, questions, answers, skillProfile };
    })
  );

  return { participant, history };
}
