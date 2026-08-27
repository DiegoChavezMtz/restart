"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import type { JobSource, JobTarget } from "@/domain/entities";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { listJobTargets } from "@/presentation/services/jobTargetService";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 960px;
`;

const Heading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeadingText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const SOURCE_LABEL: Record<JobSource, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  occ: "OCC",
  otro: "Otro",
};

export default function JobTargetsPage() {
  const [targets, setTargets] = useState<JobTarget[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { void listJobTargets().then(setTargets).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState label="Cargando vacantes…" />;
  return (
    <Page>
      <Heading>
        <HeadingText>
          <Title>Vacantes</Title>
          <Subtitle>Cada vacante que analizas queda guardada aquí junto con las palabras clave que extrajimos.</Subtitle>
        </HeadingText>
        <Button as={Link} href="/employment/targets/new">
          Analizar nueva vacante
        </Button>
      </Heading>

      <TableScroll>
        <Table>
          <Thead>
            <Tr>
              <Th>Puesto</Th>
              <Th>Empresa</Th>
              <Th>Fuente</Th>
              <Th>Keywords</Th>
              <Th><span className="sr-only">Acción</span></Th>
            </Tr>
          </Thead>
          <Tbody>
            {targets.map((target) => (
              <Tr key={target.id}>
                <Td data-label="Puesto">{target.roleTitle || "Sin título"}</Td>
                <Td data-label="Empresa">{target.companyName || "Sin empresa"}</Td>
                <Td data-label="Fuente"><Badge tone="neutral">{SOURCE_LABEL[target.sourceSite]}</Badge></Td>
                <Td data-label="Keywords">{target.keywords.length}</Td>
                <Td data-label="Acciones">
                  <Button as={Link} href={`/employment/targets/${target.id}`} variant="secondary">
                    Ver detalle
                  </Button>
                </Td>
              </Tr>
            ))}
            {targets.length === 0 && (
              <Tr>
                <Td colSpan={5} data-label="Vacantes">
                  Aún no has analizado una vacante. Empieza con una vacante real para crear un CV adaptado.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableScroll>
    </Page>
  );
}
