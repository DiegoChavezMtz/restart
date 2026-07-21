"use client";

import { useState } from "react";
import styled, { css } from "styled-components";
import { AttendanceStatusButtons } from "@/presentation/molecules/AttendanceStatusButtons";
import { JustificationModal } from "@/presentation/molecules/JustificationModal";
import type { AttendanceRecord, AttendanceSession, AttendanceStatus, User } from "@/domain/entities";

function formatSessionLabel(sessionDate: string): string {
  const [year, month, day] = sessionDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const DayTabs = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  overflow-x: auto;
  padding-bottom: ${(props) => props.theme.spacing.sm};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

const DayTab = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: transparent;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  cursor: pointer;
  text-transform: capitalize;
  white-space: nowrap;

  ${(props) =>
    props.$active &&
    css`
      background: ${props.theme.colors.primary};
      border-color: ${props.theme.colors.primary};
      color: ${props.theme.colors.background};
    `}
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const ParticipantCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 8px;
  background: ${(props) => props.theme.colors.surface};

  /* First breakpoint in the codebase — ad hoc 640px, no shared token exists yet. */
  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: ${(props) => props.theme.spacing.md};
  }
`;

const ParticipantName = styled.span`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  min-width: 0;
  overflow-wrap: break-word;
`;

const EmptyState = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
`;

export interface AttendanceRollCallProps {
  participants: User[];
  sessions: AttendanceSession[];
  recordsByParticipant: Record<string, Record<string, AttendanceRecord>>;
  isJustifying: boolean;
  onStatusChange: (
    userId: string,
    sessionId: string,
    status: Exclude<AttendanceStatus, "justificado"> | null
  ) => void;
  onJustify: (userId: string, sessionId: string, data: { description: string; file: File | null }) => void;
  onRemoveJustification: (userId: string, sessionId: string) => void;
}

export function AttendanceRollCall({
  participants,
  sessions,
  recordsByParticipant,
  isJustifying,
  onStatusChange,
  onJustify,
  onRemoveJustification,
}: AttendanceRollCallProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(sessions.at(-1)?.id ?? "");
  const [justifyUserId, setJustifyUserId] = useState<string | null>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;
  const justifyParticipant = participants.find((p) => p.id === justifyUserId) ?? null;
  const existingRecord =
    justifyUserId !== null ? recordsByParticipant[justifyUserId]?.[selectedSessionId] : undefined;

  return (
    <>
      <DayTabs>
        {sessions.map((session) => (
          <DayTab
            key={session.id}
            type="button"
            $active={session.id === selectedSessionId}
            onClick={() => setSelectedSessionId(session.id)}
          >
            {formatSessionLabel(session.sessionDate)}
          </DayTab>
        ))}
      </DayTabs>

      {participants.length === 0 ? (
        <EmptyState>Esta generación no tiene participantes.</EmptyState>
      ) : (
        <CardList>
          {participants.map((participant) => (
            <ParticipantCard key={participant.id}>
              <ParticipantName>{participant.fullName}</ParticipantName>
              <AttendanceStatusButtons
                value={recordsByParticipant[participant.id]?.[selectedSessionId]?.status ?? null}
                onChange={(status) => onStatusChange(participant.id, selectedSessionId, status)}
                onJustify={() => setJustifyUserId(participant.id)}
              />
            </ParticipantCard>
          ))}
        </CardList>
      )}

      {justifyUserId !== null && (
        <JustificationModal
          key={`${justifyUserId}:${selectedSessionId}`}
          open
          participantName={justifyParticipant?.fullName ?? ""}
          dayLabel={selectedSession ? formatSessionLabel(selectedSession.sessionDate) : ""}
          initialDescription={existingRecord?.justification?.description}
          hasExistingFile={Boolean(existingRecord?.justification?.filePath)}
          hasExisting={existingRecord?.status === "justificado"}
          isSaving={isJustifying}
          onClose={() => setJustifyUserId(null)}
          onSave={(data) => onJustify(justifyUserId, selectedSessionId, data)}
          onRemove={() => onRemoveJustification(justifyUserId, selectedSessionId)}
        />
      )}
    </>
  );
}
