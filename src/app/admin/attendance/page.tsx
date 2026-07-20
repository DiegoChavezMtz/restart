"use client";

import { useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { Select } from "@/presentation/atoms/Select";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { AttendanceRollCall } from "@/presentation/organisms/AttendanceRollCall";
import { AttendanceSummaryTable } from "@/presentation/organisms/AttendanceSummaryTable";
import type { AttendanceRecord, AttendanceSession, AttendanceStatus, Cohort, User } from "@/domain/entities";
import * as attendanceService from "@/presentation/services/attendanceService";
import * as cohortService from "@/presentation/services/cohortService";

type AttendanceSection = "rollcall" | "summary";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  max-width: 900px;
`;

const SectionTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const SelectorRow = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.md};
`;

const SectionTabs = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
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
  const [isJustifying, setIsJustifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cohortService
      .listCohorts()
      .then(setCohorts)
      .catch(() => setError("No se pudieron cargar las generaciones."));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    Promise.all([
      cohortService.getCohortDetail(cohortId),
      attendanceService.ensureRecentSessions(cohortId),
      attendanceService.listRecords(cohortId),
    ])
      .then(([detail, sessionList, recordList]) => {
        setParticipants(detail.participants);
        setSessions(sessionList);
        setRecords(recordList);
      })
      .catch(() => setError("No se pudo cargar la generación seleccionada."));
  }, [cohortId]);

  const recordsByParticipant = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRecord>> = {};
    for (const record of records) {
      (map[record.participantId] ??= {})[record.sessionId] = record;
    }
    return map;
  }, [records]);

  function handleCohortChange(value: string) {
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
          <FormField label="Generación">
            <Select value={cohortId} onChange={(e) => handleCohortChange(e.target.value)}>
              <option value="">Selecciona una generación…</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </Select>
          </FormField>
        </SelectorRow>

        {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
      </Section>

      {cohortId && sessions.length > 0 && (
        <Section>
          <SectionTabs>
            <SectionTab type="button" $active={section === "rollcall"} onClick={() => setSection("rollcall")}>
              Pase de lista
            </SectionTab>
            <SectionTab type="button" $active={section === "summary"} onClick={() => setSection("summary")}>
              Concentrado
            </SectionTab>
          </SectionTabs>

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
              onLoadJustificationFile={attendanceService.getJustificationFileUrl}
            />
          )}
        </Section>
      )}
    </>
  );
}
