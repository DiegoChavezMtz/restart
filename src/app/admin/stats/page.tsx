"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Select } from "@/presentation/atoms/Select";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { CohortStatsPanel } from "@/presentation/organisms/CohortStatsPanel";
import type { Cohort, Form } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import * as formService from "@/presentation/services/formService";
import * as statsService from "@/presentation/services/statsService";
import type { GetCohortStatsForFormResult } from "@/presentation/services/statsService";

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

export default function AdminStatsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [formId, setFormId] = useState("");
  const [stats, setStats] = useState<GetCohortStatsForFormResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([cohortService.listCohorts(), formService.listForms()])
      .then(([cohortList, formList]) => {
        setCohorts(cohortList);
        setForms(formList);
      })
      .catch(() => setError("No se pudieron cargar las cohortes/formularios."));
  }, []);

  useEffect(() => {
    if (!cohortId || !formId) return;
    statsService
      .getCohortStatsForForm(cohortId, formId)
      .then(setStats)
      .catch(() => setError("No se pudieron cargar las estadísticas."));
  }, [cohortId, formId]);

  return (
    <Section>
      <SectionTitle>Estadísticas</SectionTitle>
      <SelectorRow>
        <FormField label="Cohorte">
          <Select
            value={cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              setStats(null);
            }}
          >
            <option value="">Selecciona una cohorte…</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Formulario">
          <Select
            value={formId}
            onChange={(e) => {
              setFormId(e.target.value);
              setStats(null);
            }}
          >
            <option value="">Selecciona un formulario…</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </Select>
        </FormField>
      </SelectorRow>

      {error && <FormStatusMessage variant="error">{error}</FormStatusMessage>}
      {stats && <CohortStatsPanel result={stats} />}
    </Section>
  );
}
