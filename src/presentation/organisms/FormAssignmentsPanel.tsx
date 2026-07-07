"use client";

import { useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { Select } from "@/presentation/atoms/Select";
import type { Cohort, FormAssignment, FormAssignmentTargetType, User } from "@/domain/entities";

const Columns = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.xl};
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
  flex: 1;
`;

const ColumnTitle = styled.h3`
  font-size: ${(props) => props.theme.typography.fontSize.md};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const Row = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
`;

interface Target {
  targetType: FormAssignmentTargetType;
  targetId: string;
}

export interface FormAssignmentsPanelProps {
  cohorts: Cohort[];
  assignments: FormAssignment[];
  browsedCohortId: string;
  onBrowseCohortChange: (cohortId: string) => void;
  browsedParticipants: User[];
  onSave: (targets: Target[]) => Promise<void>;
}

export function FormAssignmentsPanel({
  cohorts,
  assignments,
  browsedCohortId,
  onBrowseCohortChange,
  browsedParticipants,
  onSave,
}: FormAssignmentsPanelProps) {
  const [targets, setTargets] = useState<Target[]>(
    assignments.map((a) => ({ targetType: a.targetType, targetId: a.targetId }))
  );
  const [isSaving, setIsSaving] = useState(false);

  function isSelected(targetType: FormAssignmentTargetType, targetId: string) {
    return targets.some((t) => t.targetType === targetType && t.targetId === targetId);
  }

  function toggle(targetType: FormAssignmentTargetType, targetId: string, checked: boolean) {
    setTargets((prev) => {
      if (checked) return [...prev, { targetType, targetId }];
      return prev.filter((t) => !(t.targetType === targetType && t.targetId === targetId));
    });
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(targets);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Columns>
        <Column>
          <ColumnTitle>Cohortes completas</ColumnTitle>
          {cohorts.map((cohort) => (
            <Row key={cohort.id}>
              <Checkbox
                checked={isSelected("cohort", cohort.id)}
                onChange={(e) => toggle("cohort", cohort.id, e.target.checked)}
              />
              {cohort.name}
            </Row>
          ))}
        </Column>

        <Column>
          <ColumnTitle>Usuarios específicos</ColumnTitle>
          <Select value={browsedCohortId} onChange={(e) => onBrowseCohortChange(e.target.value)}>
            <option value="">Explorar cohorte…</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </Select>
          {browsedParticipants.map((user) => (
            <Row key={user.id}>
              <Checkbox
                checked={isSelected("user", user.id)}
                onChange={(e) => toggle("user", user.id, e.target.checked)}
              />
              {user.fullName} ({user.email})
            </Row>
          ))}
        </Column>
      </Columns>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Guardando…" : "Guardar asignaciones"}
      </Button>
    </>
  );
}
