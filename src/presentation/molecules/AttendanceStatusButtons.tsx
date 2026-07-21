"use client";

import styled, { css } from "styled-components";
import type { AttendanceStatus } from "@/domain/entities";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  asistio: "Asistió",
  retardo: "Retardo",
  falta: "Falta",
  justificado: "Justificar",
};

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${(props) => props.theme.spacing.sm};
`;

const StatusButton = styled.button<{ $tone: AttendanceStatus; $active: boolean }>`
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 8px;
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: transparent;
  color: ${(props) => props.theme.colors.textSecondary};

  ${(props) => {
    const tone =
      props.$tone === "asistio"
        ? props.theme.colors.success
        : props.$tone === "retardo"
          ? props.theme.colors.warning
          : props.$tone === "falta"
            ? props.theme.colors.error
            : props.theme.colors.accentPurple;

    return props.$active
      ? css`
          background: ${tone};
          border-color: ${tone};
          color: ${props.theme.colors.background};
        `
      : css`
          &:hover {
            border-color: ${tone};
            color: ${props.theme.colors.textPrimary};
          }
        `;
  }}
`;

export interface AttendanceStatusButtonsProps {
  value: AttendanceStatus | null;
  onChange: (status: Exclude<AttendanceStatus, "justificado"> | null) => void;
  onJustify: () => void;
}

export function AttendanceStatusButtons({ value, onChange, onJustify }: AttendanceStatusButtonsProps) {
  return (
    <Group>
      {(Object.keys(STATUS_LABEL) as AttendanceStatus[])
        .filter((status) => status !== "justificado" || value === "falta")
        .map((status) => (
          <StatusButton
            key={status}
            type="button"
            $tone={status}
            $active={value === status}
            aria-pressed={value === status}
            onClick={() => (status === "justificado" ? onJustify() : onChange(value === status ? null : status))}
          >
            {STATUS_LABEL[status]}
          </StatusButton>
        ))}
    </Group>
  );
}
