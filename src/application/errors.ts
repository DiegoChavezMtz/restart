export class UseCaseError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code = "USE_CASE_ERROR"
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCredentialsError extends UseCaseError {
  constructor() {
    super("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
}

export class EmailNotConfirmedError extends UseCaseError {
  constructor() {
    super("Email not confirmed", 403, "EMAIL_NOT_CONFIRMED");
  }
}

export class UnauthenticatedError extends UseCaseError {
  constructor() {
    super("Not authenticated", 401, "UNAUTHENTICATED");
  }
}

export class ForbiddenError extends UseCaseError {
  constructor() {
    super("Forbidden", 403, "FORBIDDEN");
  }
}

export class InvitationNotFoundError extends UseCaseError {
  constructor() {
    super("Invitation not found or inactive", 404, "INVITATION_NOT_FOUND");
  }
}

export class InvalidTokenError extends UseCaseError {
  constructor(message = "Invalid or expired token") {
    super(message, 400, "INVALID_TOKEN");
  }
}

export class InvalidAuthInputError extends UseCaseError {
  constructor(message: string) {
    super(message, 400, "INVALID_AUTH_INPUT");
  }
}

export class EmailAlreadyRegisteredError extends UseCaseError {
  constructor() {
    super("Email already registered", 409, "EMAIL_ALREADY_REGISTERED");
  }
}

export class CohortNotFoundError extends UseCaseError {
  constructor() {
    super("Cohort not found", 404);
  }
}

export class FormNotFoundError extends UseCaseError {
  constructor() {
    super("Form not found", 404);
  }
}

export class QuestionNotFoundError extends UseCaseError {
  constructor() {
    super("Question not found", 404);
  }
}

export class FormEditLockedError extends UseCaseError {
  constructor() {
    super("This form already has responses and its questions can no longer be edited.", 409);
  }
}

export class InvalidFormStatusTransitionError extends UseCaseError {
  constructor(from: string, to: string) {
    super(`Cannot transition form from "${from}" to "${to}"`, 409);
  }
}

export class InvalidQuestionConfigError extends UseCaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class FormSkillNotFoundError extends UseCaseError {
  constructor() {
    super("FormSkill not found", 404);
  }
}

export class InvalidFormSkillError extends UseCaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class InvalidSkillWeightError extends UseCaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class SkillWeightRequiresLikertQuestionError extends UseCaseError {
  constructor() {
    super("QuestionSkillWeight solo es válido para preguntas de tipo 'likert'.", 400);
  }
}

export class FormResponseNotFoundError extends UseCaseError {
  constructor() {
    super("Form response not found", 404);
  }
}

export class FormResponseAlreadyCompletedError extends UseCaseError {
  constructor() {
    super("This form response has already been completed", 409);
  }
}

export class QuestionOutOfOrderError extends UseCaseError {
  constructor() {
    super("This is not the current question for this response", 409);
  }
}

export class InvalidAnswerValueError extends UseCaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class FormNotAcceptingResponsesError extends UseCaseError {
  constructor() {
    super("This form is not currently accepting responses", 409);
  }
}

export class UserNotFoundError extends UseCaseError {
  constructor() {
    super("User not found", 404);
  }
}

export class InvalidQuestionOptionBranchError extends UseCaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class InvalidAttendanceInputError extends UseCaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AttendanceRecordNotFoundError extends UseCaseError {
  constructor() {
    super("Attendance record not found", 404);
  }
}

export class NoParticipantsFoundError extends UseCaseError {
  constructor() {
    super("This cohort has no eligible participants", 404);
  }
}

export class LlmDisabledError extends UseCaseError {
  constructor() {
    super("La asistencia con IA está desactivada temporalmente por el administrador.", 503, "LLM_DISABLED");
  }
}

export class LlmResponseError extends UseCaseError {
  constructor(message = "No fue posible generar el contenido solicitado.") {
    super(message, 502, "LLM_RESPONSE_ERROR");
  }
}
