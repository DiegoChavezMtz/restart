"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Select } from "@/presentation/atoms/Select";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { CohortStatsPanel } from "@/presentation/organisms/CohortStatsPanel";
import type { Cohort, Form } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import * as formService from "@/presentation/services/formService";
import * as statsService from "@/presentation/services/statsService";
import type { GetCohortStatsForFormResult } from "@/presentation/services/statsService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 1080px;
`;

const Intro = styled.p`
  max-width: 62ch;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  padding: ${(props) => props.theme.spacing.xl};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 640px) { padding: ${(props) => props.theme.spacing.lg}; }
`;

const Selectors = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const SectionTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;

type LoadState = "loading" | "loaded" | "error";

export default function AdminStatsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [cohortId, setCohortId] = useState("");
  const [formId, setFormId] = useState("");
  const [stats, setStats] = useState<GetCohortStatsForFormResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([cohortService.listCohorts(), formService.listForms()])
      .then(([cohortList, formList]) => { setCohorts(cohortList); setForms(formList); setLoadState("loaded"); })
      .catch(() => { setError("No se pudieron cargar las cohortes y formularios."); setLoadState("error"); });
  }, []);

  useEffect(() => {
    if (!cohortId || !formId) return;
    statsService.getCohortStatsForForm(cohortId, formId).then(setStats).catch(() => setError("No se pudieron cargar las estadísticas."));
  }, [cohortId, formId]);

  const isLoadingStats = Boolean(cohortId && formId && stats === null && error === null);

  return (
    <Page>
      <Intro>Explora la participación y las respuestas de una cohorte por formulario para detectar tendencias y oportunidades.</Intro>
      <Card>
        <SectionTitle>Selecciona qué quieres analizar</SectionTitle>
        {loadState === "loading" && <LoadingState label="Cargando opciones…" />}
        {loadState === "error" && <EmptyState title="No fue posible preparar las estadísticas" description="Actualiza la página para volver a intentarlo." />}
        {loadState === "loaded" && (
          <Selectors>
            <FormField label="Cohorte" htmlFor="stats-cohort"><Select id="stats-cohort" value={cohortId} onChange={(e) => { setError(null); setCohortId(e.target.value); setStats(null); }}><option value="">Selecciona una cohorte…</option>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select></FormField>
            <FormField label="Formulario" htmlFor="stats-form"><Select id="stats-form" value={formId} onChange={(e) => { setError(null); setFormId(e.target.value); setStats(null); }}><option value="">Selecciona un formulario…</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.title}</option>)}</Select></FormField>
          </Selectors>
        )}
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
      </Card>
      {loadState === "loaded" && !cohortId && !formId && <EmptyState title="Elige una cohorte y un formulario" description="Mostraremos el nivel de finalización y el desglose de respuestas." />}
      {isLoadingStats && <LoadingState label="Calculando estadísticas…" />}
      {stats && !isLoadingStats && <Card><CohortStatsPanel result={stats} /></Card>}
    </Page>
  );
}
