"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";
import * as soundService from "@/presentation/services/soundService";

// Last 20% of the countdown switches to the warning color/pulse — same
// threshold used to decide when to fire the one-shot warning sound.
const WARNING_THRESHOLD = 0.2;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const TimeLabel = styled.span<{ $warning: boolean }>`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  font-weight: ${(props) =>
    props.$warning
      ? props.theme.typography.fontWeight.medium
      : props.theme.typography.fontWeight.regular};
  color: ${(props) => (props.$warning ? props.theme.colors.warning : props.theme.colors.textSecondary)};
`;

const Track = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: ${(props) => props.theme.colors.border};
  overflow: hidden;
`;

const Fill = styled.div<{ $percent: number; $warning: boolean }>`
  height: 100%;
  width: ${(props) => props.$percent}%;
  background: ${(props) => (props.$warning ? props.theme.colors.warning : props.theme.colors.primary)};
  transition: width 1s linear, background-color 0.3s ease;
`;

export interface CountdownTimerProps {
  totalSeconds: number;
  onExpire: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Purely client-side: remounting (new question via `key`, or a page reload)
// always restarts a fresh countdown — no server-persisted start time.
export function CountdownTimer({ totalSeconds, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const hasExpired = useRef(false);
  const hasWarned = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (remaining <= 0) {
      if (!hasExpired.current) {
        hasExpired.current = true;
        onExpire();
      }
      return;
    }
    const timeout = setTimeout(() => setRemaining((prev) => prev - 1), 1000);
    return () => clearTimeout(timeout);
  }, [remaining, onExpire]);

  const isWarning = remaining > 0 && remaining / totalSeconds <= WARNING_THRESHOLD;

  useEffect(() => {
    if (isWarning && !hasWarned.current) {
      hasWarned.current = true;
      soundService.playTimeWarningSound();
    }
  }, [isWarning]);

  return (
    <Wrapper role="timer" aria-live="polite">
      <TimeLabel $warning={isWarning}>Tiempo restante: {formatTime(Math.max(remaining, 0))}</TimeLabel>
      <motion.div
        animate={isWarning && !reducedMotion ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={
          isWarning && !reducedMotion
            ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
            : undefined
        }
      >
        <Track>
          <Fill $percent={Math.max((remaining / totalSeconds) * 100, 0)} $warning={isWarning} />
        </Track>
      </motion.div>
    </Wrapper>
  );
}
