export type EmploymentLlmTask = "extract_job_keywords" | "job_fit_matrix" | "draft_cv_summary" | "draft_cv_summary_options" | "evidence_question" | "draft_cv_bullet" | "cv_coherence_check" | "outreach_message" | "ikigai_synthesis";

export interface TextLlmRequest {
  system: string;
  user: string;
  temperature: number;
  maxCompletionTokens: number;
}

export interface TextLlmResponse {
  text: string;
  model: string;
  requestId: string | null;
}

export interface TextLlmProvider {
  complete(request: TextLlmRequest): Promise<TextLlmResponse>;
}

export interface ExtractedKeyword { keyword: string; relevance: "high" | "medium" | "low"; }
export interface EvidenceQuestion { questions: string[]; }
export interface DraftBullet { alternatives: string[]; qualitativeOnly: boolean; }
export interface DraftSummary { headline: string; summary: string; }
export interface DraftSummaryOptions { alternatives: DraftSummary[]; }
export interface CoherenceCheck { notes: string[]; }
export interface OutreachMessage { message: string; }
export interface IkigaiSynthesis { synthesis: string; }
export interface JobFitMatrixItem { requirement: string; priority: "indispensable" | "important" | "desirable"; status: "demonstrated" | "partial" | "not_demonstrated"; evidenceRefs: string[]; suggestion: string; }
