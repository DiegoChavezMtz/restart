"use client";

import { useState } from "react";
import styled from "styled-components";
import { isAxiosError } from "axios";
import { Button } from "@/presentation/atoms/Button";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as reportService from "@/presentation/services/reportService";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${(props) => props.theme.spacing.md};
`;

const Description = styled.p`
  max-width: 62ch;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

async function extractErrorMessage(error: unknown): Promise<string> {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // fall through to the generic message
    }
  }
  return "No se pudo generar el reporte. Intenta de nuevo.";
}

export interface ReportGeneratorPanelProps {
  cohortId: string;
  formId: string;
}

export function ReportGeneratorPanel({ cohortId, formId }: ReportGeneratorPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      await reportService.downloadReportPdf(cohortId, formId);
    } catch (err) {
      setError(await extractErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Wrapper>
      <Description>
        Genera un PDF con el brief estadístico de la generación, la interpretación de Gemini
        sobre su nivel financiero, y una hoja por participante con sus respuestas e interpretación
        individual. La generación puede tardar un momento.
      </Description>
      <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Generando reporte…" : "Generar PDF"}
      </Button>
      {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
    </Wrapper>
  );
}
