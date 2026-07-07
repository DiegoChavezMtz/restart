"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";
import type { QuestionConfig } from "@/domain/value-objects";
import * as soundService from "@/presentation/services/soundService";

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.md};
`;

const Point = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
`;

const Dot = styled(motion.button)<{ $selected: boolean; $interactive: boolean; $dimmed: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid
    ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.border)};
  background: ${(props) => (props.$selected ? props.theme.colors.primary : "transparent")};
  padding: 0;
  cursor: ${(props) => (props.$interactive ? "pointer" : "default")};
  opacity: ${(props) => (props.$dimmed ? 0.6 : 1)};
  transition: background-color 0.2s ease, border-color 0.2s ease;
`;

const Check = styled(motion.span)`
  color: ${(props) => props.theme.colors.background};
  font-size: 16px;
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  line-height: 1;
`;

const PointLabel = styled.span`
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  text-align: center;
`;

export interface LikertScaleProps {
  config: Extract<QuestionConfig, { type: "likert" }>;
  value?: number;
  onSelect?: (value: number) => void;
  disabled?: boolean;
}

// value/onSelect are optional: omitted (as in FormPreviewModal), this stays
// a plain read-only display exactly as it was in Fase 1. Provided (Fase 2's
// response flow), the dots become selectable.
export function LikertScale({ config, value, onSelect, disabled }: LikertScaleProps) {
  const points = Array.from(
    { length: config.scaleMax - config.scaleMin + 1 },
    (_, i) => config.scaleMin + i
  );
  const interactive = Boolean(onSelect) && !disabled;
  // Only dim when explicitly disabled during the response flow (a past,
  // already-answered question) — plain preview mode (no onSelect at all,
  // Fase 1's FormPreviewModal) must keep its original full-opacity look.
  const dimmed = Boolean(onSelect) && Boolean(disabled);
  const reducedMotion = useReducedMotion();

  function handleSelect(point: number) {
    onSelect?.(point);
    soundService.playSelectSound();
  }

  return (
    <Row>
      {points.map((point, index) => {
        const selected = value === point;
        return (
          <Point key={point}>
            <Dot
              type="button"
              $selected={selected}
              $interactive={interactive}
              $dimmed={dimmed}
              disabled={!interactive}
              onClick={() => handleSelect(point)}
              whileTap={interactive && !reducedMotion ? { scale: 0.96 } : undefined}
            >
              <AnimatePresence>
                {selected && (
                  <Check
                    initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={reducedMotion ? undefined : { scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    ✓
                  </Check>
                )}
              </AnimatePresence>
            </Dot>
            <PointLabel>{config.labels?.[index] ?? point}</PointLabel>
          </Point>
        );
      })}
    </Row>
  );
}
