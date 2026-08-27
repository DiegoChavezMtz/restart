import { UseCaseError } from "@/application/errors";
import type { ApplicationRepository, CvRepository, JobTargetRepository } from "@/domain/repositories";
import type { JobApplication, User } from "@/domain/entities";
import { assertEmploymentUser } from "./profileHelpers";
type Context = { requestedBy: User; accessToken: string };
export async function createApplication(repos: { applications: ApplicationRepository; targets: JobTargetRepository; cv: CvRepository }, input: Context & { jobTargetId?: unknown; cvVersionId?: unknown; appliedAt?: unknown }): Promise<JobApplication> {
  assertEmploymentUser(input.requestedBy);
  if (typeof input.jobTargetId !== "string" || typeof input.cvVersionId !== "string" || typeof input.appliedAt !== "string") throw new UseCaseError("La postulación no contiene datos válidos.", 400);
  const [target, cv] = await Promise.all([repos.targets.getJobTarget(input.jobTargetId, input.accessToken), repos.cv.get(input.cvVersionId, input.accessToken)]);
  if (!target || !cv || cv.jobTargetId !== target.id) throw new UseCaseError("La vacante y el CV deben corresponder.", 400);
  return repos.applications.create({ jobTargetId: target.id, cvVersionId: cv.id, source: target.sourceSite, applicationType: "reactive", companyName: target.companyName ?? "Empresa no especificada", roleTitle: target.roleTitle ?? "Puesto no especificado", status: "applied", appliedAt: input.appliedAt }, input.accessToken);
}
export async function updateApplicationStatus(repo: ApplicationRepository, id: string, input: Context & { status?: unknown }): Promise<JobApplication> { assertEmploymentUser(input.requestedBy); if (!(["applied", "response", "interview", "offer", "rejected"] as string[]).includes(String(input.status))) throw new UseCaseError("Estatus inválido.", 400); return repo.updateStatus(id, input.status as JobApplication["status"], input.accessToken); }
