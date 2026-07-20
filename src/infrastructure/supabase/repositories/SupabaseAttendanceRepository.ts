import { UseCaseError } from "@/application/errors";
import type { AttendanceRecord, AttendanceSession, AttendanceStatus } from "@/domain/entities";
import type { AttendanceRepository, JustifyAttendanceInput } from "@/domain/repositories";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { toDomainAttendanceRecord } from "@/infrastructure/supabase/mappers/toDomainAttendanceRecord";
import { toDomainAttendanceSession } from "@/infrastructure/supabase/mappers/toDomainAttendanceSession";

const BUCKET = "attendance-justifications";
const RECORD_SELECT = "*, attendance_justifications(description, file_path, file_type)";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export class SupabaseAttendanceRepository implements AttendanceRepository {
  async listSessionsByCohort(
    cohortId: string,
    adminAccessToken: string
  ): Promise<AttendanceSession[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("attendance_sessions")
      .select("*")
      .eq("cohort_id", cohortId)
      .order("session_date", { ascending: true });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainAttendanceSession);
  }

  async ensureSession(
    cohortId: string,
    sessionDate: string,
    createdBy: string,
    adminAccessToken: string
  ): Promise<void> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error } = await client
      .from("attendance_sessions")
      .upsert(
        { cohort_id: cohortId, session_date: sessionDate, created_by: createdBy },
        { onConflict: "cohort_id,session_date", ignoreDuplicates: true }
      );
    if (error) throw new UseCaseError(error.message, 500);
  }

  async listRecordsByCohort(
    cohortId: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord[]> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data, error } = await client
      .from("attendance_records")
      .select(`${RECORD_SELECT}, attendance_sessions!inner(cohort_id)`)
      .eq("attendance_sessions.cohort_id", cohortId);
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map(toDomainAttendanceRecord);
  }

  async getRecord(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord | null> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("attendance_records")
      .select(RECORD_SELECT)
      .eq("session_id", sessionId)
      .eq("participant_id", participantId)
      .maybeSingle();
    if (error) throw new UseCaseError(error.message, 500);
    return row ? toDomainAttendanceRecord(row) : null;
  }

  async setStatus(
    sessionId: string,
    participantId: string,
    status: Exclude<AttendanceStatus, "justificado">,
    recordedBy: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { data: row, error } = await client
      .from("attendance_records")
      .upsert(
        { session_id: sessionId, participant_id: participantId, status, recorded_by: recordedBy },
        { onConflict: "session_id,participant_id" }
      )
      .select(RECORD_SELECT)
      .single();
    if (error || !row) {
      throw new UseCaseError(error?.message ?? "Failed to set attendance status", 500);
    }

    // Un record puede venir de un 'justificado' previo — al pasarlo directo a
    // asistio/retardo/falta (sin pasar por "quitar justificación") la
    // justificación queda huérfana. No-op si no existía ninguna.
    const { error: cleanupError } = await client
      .from("attendance_justifications")
      .delete()
      .eq("attendance_record_id", row.id);
    if (cleanupError) throw new UseCaseError(cleanupError.message, 500);

    return toDomainAttendanceRecord(row);
  }

  async clearStatus(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<void> {
    const client = createServerSupabaseClient(adminAccessToken);
    const { error } = await client
      .from("attendance_records")
      .delete()
      .eq("session_id", sessionId)
      .eq("participant_id", participantId);
    if (error) throw new UseCaseError(error.message, 500);
  }

  async justify(
    input: JustifyAttendanceInput,
    adminAccessToken: string
  ): Promise<AttendanceRecord> {
    const client = createServerSupabaseClient(adminAccessToken);

    let filePath: string | null = null;
    let fileType: string | null = null;

    if (input.file) {
      filePath = `${input.sessionId}/${input.participantId}-${Date.now()}-${sanitizeFileName(input.file.name)}`;
      fileType = input.file.type;
      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(filePath, input.file, { contentType: fileType, upsert: true });
      if (uploadError) throw new UseCaseError(uploadError.message, 500);
    } else {
      // Sin archivo nuevo: preserva el que ya hubiera (editar solo la
      // descripción no debe borrar el archivo existente).
      const existing = await this.getRecord(input.sessionId, input.participantId, adminAccessToken);
      filePath = existing?.justification?.filePath ?? null;
      fileType = existing?.justification?.fileType ?? null;
    }

    const { data: recordId, error } = await client.rpc("justify_attendance", {
      p_session_id: input.sessionId,
      p_participant_id: input.participantId,
      p_description: input.description,
      p_file_path: filePath,
      p_file_type: fileType,
    });
    if (error || !recordId) {
      throw new UseCaseError(error?.message ?? "Failed to justify attendance", 500);
    }

    const record = await this.getRecord(input.sessionId, input.participantId, adminAccessToken);
    if (!record) throw new UseCaseError("Attendance record not found after justify", 500);
    return record;
  }

  async removeJustification(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord> {
    const client = createServerSupabaseClient(adminAccessToken);
    const existing = await this.getRecord(sessionId, participantId, adminAccessToken);
    if (!existing) throw new UseCaseError("Attendance record not found", 404);

    const { error } = await client.rpc("remove_attendance_justification", {
      p_record_id: existing.id,
    });
    if (error) throw new UseCaseError(error.message, 500);

    const record = await this.getRecord(sessionId, participantId, adminAccessToken);
    if (!record) throw new UseCaseError("Attendance record not found after removal", 500);
    return record;
  }

  async getJustificationFileUrl(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<{ url: string; fileType: string } | null> {
    const client = createServerSupabaseClient(adminAccessToken);
    const record = await this.getRecord(sessionId, participantId, adminAccessToken);
    const filePath = record?.justification?.filePath;
    const fileType = record?.justification?.fileType;
    if (!filePath || !fileType) return null;

    const { data, error } = await client.storage.from(BUCKET).createSignedUrl(filePath, 300);
    if (error || !data) throw new UseCaseError(error?.message ?? "Failed to sign file URL", 500);

    return { url: data.signedUrl, fileType };
  }
}
