"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Select } from "@/presentation/atoms/Select";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { ReportGeneratorPanel } from "@/presentation/organisms/ReportGeneratorPanel";
import type { Cohort, Form } from "@/domain/entities";
import * as cohortService from "@/presentation/services/cohortService";
import * as formService from "@/presentation/services/formService";

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

export default function AdminReportsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [cohortId, setCohortId] = useState("");
  const [formId, setFormId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([cohortService.listCohorts(), formService.listForms()])
      .then(([cohortList, formList]) => { setCohorts(cohortList); setForms(formList); setLoadState("loaded"); })
      .catch(() => { setError("No se pudieron cargar las cohortes y formularios."); setLoadState("error"); });
  }, []);

  return (
    <Page>
      <Intro>
        Selecciona una cohorte y un formulario que haya respondido para generar un reporte en PDF
        con el brief de la generación y un reporte individual por participante, ambos con
        interpretación de Gemini sobre su nivel financiero.
      </Intro>
      <Card>
        <SectionTitle>Selecciona qué quieres reportar</SectionTitle>
        {loadState === "loading" && <LoadingState label="Cargando opciones…" />}
        {loadState === "error" && <EmptyState title="No fue posible preparar los reportes" description="Actualiza la página para volver a intentarlo." />}
        {loadState === "loaded" && (
          <Selectors>
            <FormField label="Cohorte" htmlFor="reports-cohort"><Select id="reports-cohort" value={cohortId} onChange={(e) => { setError(null); setCohortId(e.target.value); }}><option value="">Selecciona una cohorte…</option>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</Select></FormField>
            <FormField label="Formulario" htmlFor="reports-form"><Select id="reports-form" value={formId} onChange={(e) => { setError(null); setFormId(e.target.value); }}><option value="">Selecciona un formulario…</option>{forms.map((form) => <option key={form.id} value={form.id}>{form.title}</option>)}</Select></FormField>
          </Selectors>
        )}
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
      </Card>
      {loadState === "loaded" && !cohortId && !formId && <EmptyState title="Elige una cohorte y un formulario" description="Podrás generar el PDF con el reporte general e individual." />}
      {cohortId && formId && <Card><ReportGeneratorPanel cohortId={cohortId} formId={formId} /></Card>}
    </Page> 
  );
}
