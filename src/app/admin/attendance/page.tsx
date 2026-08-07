"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { Select } from "@/presentation/atoms/Select";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AttendanceRollCall } from "@/presentation/organisms/AttendanceRollCall";
import { AttendanceSummaryTable } from "@/presentation/organisms/AttendanceSummaryTable";
import type { AttendanceRecord, AttendanceSession, AttendanceStatus, Cohort, User } from "@/domain/entities";
import * as attendanceService from "@/presentation/services/attendanceService";
import * as cohortService from "@/presentation/services/cohortService";

type AttendanceSection = "rollcall" | "summary";

const Section = styled.section<{ $topGap?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 900px;

  ${(props) =>
    props.$topGap &&
    css`
      margin-top: ${props.theme.spacing.xl};
    `}
`;

const SectionTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const SelectorRow = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const SectionTabs = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  margin-bottom: ${(props) => props.theme.spacing.lg};
  overflow-x: auto;
`;

const SectionTab = styled.button<{ $active: boolean }>`
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.lg};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: transparent;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  cursor: pointer;

  ${(props) =>
    props.$active &&
    css`
      background: ${props.theme.colors.primary};
      border-color: ${props.theme.colors.primary};
      color: ${props.theme.colors.background};
    `}
`;

function replaceRecord(
  records: AttendanceRecord[],
  sessionId: string,
  participantId: string,
  next: AttendanceRecord | null
): AttendanceRecord[] {
  const withoutPrevious = records.filter(
    (r) => !(r.sessionId === sessionId && r.participantId === participantId)
  );
  return next ? [...withoutPrevious, next] : withoutPrevious;
}

export default function AdminAttendancePage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [participants, setParticipants] = useState<User[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [section, setSection] = useState<AttendanceSection>("rollcall");
  const [isLoadingCohorts, setIsLoadingCohorts] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isJustifying, setIsJustifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cohortService
      .listCohorts()
      .then(setCohorts)
      .catch(() => setError("No se pudieron cargar las cohortes."))
      .finally(() => setIsLoadingCohorts(false));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    Promise.all([
      cohortService.getCohortDetail(cohortId),
      attendanceService.ensureRecentSessions(cohortId),
      attendanceService.listRecords(cohortId),
    ])
      .then(([detail, sessionList, recordList]) => {
        setParticipants(detail.participants.filter((participant) => participant.role === "usuario"));
        setSessions(sessionList);
        setRecords(recordList);
      })
      .catch(() => setError("No se pudo cargar la cohorte seleccionada."))
      .finally(() => setIsLoadingDetail(false));
  }, [cohortId]);

  const recordsByParticipant = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRecord>> = {};
    for (const record of records) {
      (map[record.participantId] ??= {})[record.sessionId] = record;
    }
    return map;
  }, [records]);

  function handleCohortChange(value: string) {
    setIsLoadingDetail(Boolean(value));
    setCohortId(value);
    setParticipants([]);
    setSessions([]);
    setRecords([]);
  }

  async function handleStatusChange(
    userId: string,
    sessionId: string,
    status: Exclude<AttendanceStatus, "justificado"> | null
  ) {
    try {
      if (status === null) {
        await attendanceService.clearAttendanceStatus(sessionId, userId);
        setRecords((prev) => replaceRecord(prev, sessionId, userId, null));
      } else {
        const record = await attendanceService.setAttendanceStatus(sessionId, userId, status);
        setRecords((prev) => replaceRecord(prev, sessionId, userId, record));
      }
    } catch {
      setError("No se pudo actualizar la asistencia.");
    }
  }

  async function handleJustify(
    userId: string,
    sessionId: string,
    data: { description: string; file: File | null }
  ) {
    setIsJustifying(true);
    try {
      const record = await attendanceService.justifyAttendance(
        sessionId,
        userId,
        data.description,
        data.file
      );
      setRecords((prev) => replaceRecord(prev, sessionId, userId, record));
    } catch {
      setError("No se pudo guardar la justificación.");
    } finally {
      setIsJustifying(false);
    }
  }

  async function handleRemoveJustification(userId: string, sessionId: string) {
    try {
      const record = await attendanceService.removeJustification(sessionId, userId);
      setRecords((prev) => replaceRecord(prev, sessionId, userId, record));
    } catch {
      setError("No se pudo quitar la justificación.");
    }
  }

  return (
    <>
      <Section>
        <SectionTitle>Asistencia</SectionTitle>
        <SelectorRow>
          <FormField label="Cohorte" htmlFor="attendance-cohort">
            <Select id="attendance-cohort" value={cohortId} onChange={(e) => handleCohortChange(e.target.value)} disabled={isLoadingCohorts}>
              <option value="">Selecciona una cohorte…</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </Select>
          </FormField>
        </SelectorRow>

        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
        {isLoadingCohorts && <LoadingState label="Cargando cohortes…" />}
      </Section>

      {isLoadingDetail && <LoadingState label="Cargando asistencia…" />}
      {cohortId && sessions.length > 0 && (
        <Section $topGap>
          <SectionTabs role="tablist" aria-label="Vistas de asistencia">
            <SectionTab type="button" role="tab" id="attendance-tab-rollcall" aria-controls="attendance-panel-rollcall" aria-selected={section === "rollcall"} $active={section === "rollcall"} onClick={() => setSection("rollcall")}>
              Pase de lista
            </SectionTab>
            <SectionTab type="button" role="tab" id="attendance-tab-summary" aria-controls="attendance-panel-summary" aria-selected={section === "summary"} $active={section === "summary"} onClick={() => setSection("summary")}>
              Concentrado
            </SectionTab>
          </SectionTabs>

          <div role="tabpanel" id={`attendance-panel-${section}`} aria-labelledby={`attendance-tab-${section}`}>
          {section === "rollcall" ? (
            <AttendanceRollCall
              participants={participants}
              sessions={sessions}
              recordsByParticipant={recordsByParticipant}
              isJustifying={isJustifying}
              onStatusChange={handleStatusChange}
              onJustify={handleJustify}
              onRemoveJustification={handleRemoveJustification}
            />
          ) : (
            <AttendanceSummaryTable
              participants={participants}
              sessions={sessions}
              records={records}
              cohortName={cohorts.find((cohort) => cohort.id === cohortId)?.name}
              onLoadJustificationFile={attendanceService.getJustificationFileUrl}
            />
          )}
          </div>
        </Section>
      )}
    </>
  );
}
