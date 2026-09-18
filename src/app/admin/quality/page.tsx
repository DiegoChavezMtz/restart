"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Checkbox } from "@/presentation/atoms/Checkbox";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import type { Form } from "@/domain/entities";
import { QUALITY_RESTART_TAG } from "@/application/use-cases/quality/GetQualityEvaluationReport";
import * as formService from "@/presentation/services/formService";
import * as reportService from "@/presentation/services/reportService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 1080px;
`;
const Intro = styled.p`
  max-width: 68ch;
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
`;
const Heading = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
`;
const Description = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(props) => props.theme.spacing.md};
`;
const SelectionCount = styled.span`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

export default function QualityPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const qualityForms = forms.filter((form) => form.tags.includes(QUALITY_RESTART_TAG));

  useEffect(() => {
    formService.listForms()
      .then((items) => { setForms(items); setState("ready"); })
      .catch(() => { setState("error"); setError("No se pudieron cargar los formularios clasificados."); });
  }, []);

  function toggle(formId: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(formId)) next.delete(formId); else next.add(formId);
      return next;
    });
  }

  async function generate() {
    setError(null);
    setIsGenerating(true);
    try {
      await reportService.downloadQualityReport([...selectedIds]);
    } catch {
      setError("No se pudo generar el reporte. Confirma que los formularios tienen las tres preguntas de evaluación Restart.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Page>
      <Intro>
        Selecciona los formularios clasificados como evaluación Restart para consolidar sus respuestas. El archivo incluye un resumen con estadísticas e interpretación asistida por IA, además de una hoja para cada formulario.
      </Intro>
      <Card>
        <div>
          <Heading>Formularios para análisis</Heading>
          <Description>Solo aparecen formularios con la etiqueta “{QUALITY_RESTART_TAG}”. Configura esa etiqueta desde el formulario antes de incluirlo.</Description>
        </div>
        {state === "loading" && <LoadingState label="Cargando formularios…" />}
        {state === "error" && <EmptyState title="No fue posible cargar los formularios" description="Actualiza la página para intentarlo de nuevo." />}
        {state === "ready" && qualityForms.length === 0 && <EmptyState title="No hay formularios clasificados" description="Agrega la etiqueta calidad-restart a los formularios que usan las tres preguntas de evaluación." />}
        {state === "ready" && qualityForms.length > 0 && (
          <TableScroll>
            <Table>
              <Thead><Tr><Th><span className="sr-only">Seleccionar</span></Th><Th>Formulario</Th><Th>Estado</Th><Th>Actualizado</Th></Tr></Thead>
              <Tbody>
                {qualityForms.map((form) => (
                  <Tr key={form.id}>
                    <Td><Checkbox aria-label={`Incluir ${form.title}`} checked={selectedIds.has(form.id)} onChange={() => toggle(form.id)} /></Td>
                    <Td>{form.title}</Td>
                    <Td>{form.status}</Td>
                    <Td>{new Date(form.updatedAt).toLocaleDateString("es-MX")}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
        )}
        <Actions>
          <Button onClick={generate} disabled={selectedIds.size === 0 || isGenerating}>
            {isGenerating ? "Generando Excel…" : "Generar reporte Excel"}
          </Button>
          <SelectionCount>{selectedIds.size} {selectedIds.size === 1 ? "formulario seleccionado" : "formularios seleccionados"}</SelectionCount>
        </Actions>
        {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
      </Card>
    </Page>
  );
}
