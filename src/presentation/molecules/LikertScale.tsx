"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";
import type { QuestionConfig } from "@/domain/value-objects";
import * as soundService from "@/presentation/services/soundService";

const Scale = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.sm};

  @media (min-width: 720px) {
    grid-template-columns: repeat(${(props) => props.$count}, minmax(0, 1fr));
    gap: ${(props) => props.theme.spacing.md};
  }
`;

const Option = styled(motion.button)<{ $selected: boolean; $interactive: boolean; $dimmed: boolean }>`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  min-height: 56px;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border: 1px solid ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.border)};
  border-radius: 12px;
  background: ${(props) => (props.$selected ? props.theme.colors.surfaceElevated : props.theme.colors.background)};
  color: ${(props) => props.theme.colors.textPrimary};
  text-align: left;
  cursor: ${(props) => (props.$interactive ? "pointer" : "default")};
  opacity: ${(props) => (props.$dimmed ? 0.6 : 1)};
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;

  &:hover:not(:disabled) { border-color: ${(props) => props.theme.colors.primary}; }
  &:focus-visible { outline: 2px solid ${(props) => props.theme.colors.focus}; outline-offset: 3px; }

  @media (min-width: 720px) {
    grid-template-columns: 1fr;
    align-content: start;
    justify-items: center;
    min-height: 132px;
    padding: ${(props) => props.theme.spacing.md} ${(props) => props.theme.spacing.sm};
    text-align: center;
  }
`;

const Marker = styled.span<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 2px solid ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.border)};
  border-radius: 50%;
  background: ${(props) => (props.$selected ? props.theme.colors.primary : "transparent")};
  color: ${(props) => props.theme.colors.background};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const OptionLabel = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  line-height: ${(props) => props.theme.typography.lineHeight.normal};
`;

const Check = styled(motion.span)`font-size: 16px; line-height: 1;`;

export interface LikertScaleProps {
  config: Extract<QuestionConfig, { type: "likert" }>;
  value?: number;
  onSelect?: (value: number) => void;
  disabled?: boolean;
}

export function LikertScale({ config, value, onSelect, disabled }: LikertScaleProps) {
  const points = Array.from({ length: config.scaleMax - config.scaleMin + 1 }, (_, i) => config.scaleMin + i);
  const interactive = Boolean(onSelect) && !disabled;
  const dimmed = Boolean(onSelect) && Boolean(disabled);
  const reducedMotion = useReducedMotion();

  function handleSelect(point: number) {
    if (!interactive) return;
    onSelect?.(point);
    soundService.playSelectSound();
  }

  return (
    <Scale $count={points.length} role="radiogroup" aria-label="Escala de respuesta">
      {points.map((point, index) => {
        const selected = value === point;
        const label = config.labels?.[index] ?? String(point);
        return (
          <Option key={point} type="button" role="radio" aria-checked={selected} aria-label={`${point}. ${label}`}
            $selected={selected} $interactive={interactive} $dimmed={dimmed} disabled={!interactive}
            onClick={() => handleSelect(point)} whileTap={interactive && !reducedMotion ? { scale: 0.98 } : undefined}>
            <Marker $selected={selected} aria-hidden="true">
              <AnimatePresence>{selected ? <Check initial={reducedMotion ? false : { scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={reducedMotion ? undefined : { scale: 0, opacity: 0 }}>✓</Check> : point}</AnimatePresence>
            </Marker>
            <OptionLabel>{label}</OptionLabel>
          </Option>
        );
      })}
    </Scale>
  );
}
