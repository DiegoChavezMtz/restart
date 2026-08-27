"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { LoadingState } from "@/presentation/molecules/AsyncState";
import { getEmploymentInsights } from "@/presentation/services/employmentInsightsService";
import type { EmploymentInsightAction, EmploymentInsights } from "@/application/use-cases/employability/EmploymentInsightsActions";

const Page = styled.section`display:flex; flex-direction:column; gap:${(p) => p.theme.spacing.xl}; max-width:960px;`;
const Heading = styled.div`display:flex; flex-direction:column; gap:${(p) => p.theme.spacing.sm};`;
const Title = styled.h1`color:${(p) => p.theme.colors.textPrimary}; font-size:${(p) => p.theme.typography.fontSize.xl};`;
const Text = styled.p`color:${(p) => p.theme.colors.textSecondary}; line-height:${(p) => p.theme.typography.lineHeight.relaxed};`;
const Grid = styled.div`display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:${(p) => p.theme.spacing.md};`;
const Card = styled.section`display:flex; flex-direction:column; gap:${(p) => p.theme.spacing.sm}; padding:${(p) => p.theme.spacing.lg}; border:1px solid ${(p) => p.theme.colors.border}; border-radius:16px; background:${(p) => p.theme.colors.surface};`;
const Number = styled.strong`font-size:${(p) => p.theme.typography.fontSize["2xl"]}; color:${(p) => p.theme.colors.textPrimary};`;
const Rows = styled.div`display:flex; flex-direction:column; gap:${(p) => p.theme.spacing.sm};`;
const Row = styled.div`display:flex; justify-content:space-between; align-items:center; gap:${(p) => p.theme.spacing.md}; padding:${(p) => p.theme.spacing.sm} 0; border-bottom:1px solid ${(p) => p.theme.colors.border};`;

const percent = (value: number | null) => value === null ? "Sin datos" : `${value}%`;
function ActionCard({ action, main = false }: { action: EmploymentInsightAction; main?: boolean }) {
  return <Card><Badge tone={action.priority === "high" ? "warning" : "info"}>{main ? "Siguiente acción" : "Sugerencia revisable"}</Badge><strong>{action.title}</strong><Text>{action.detail}</Text><div><Button as={Link} href={action.href} variant={main ? "primary" : "secondary"}>{main ? "Ir a la acción" : "Revisar"}</Button></div></Card>;
}

export default function EmploymentInsightsPage() {
  const [insights, setInsights] = useState<EmploymentInsights | null>(null);
  useEffect(() => { void getEmploymentInsights().then(setInsights); }, []);
  if (!insights) return <LoadingState label="Calculando tu embudo personal…" />;
  return <Page>
    <Heading><Title>Decisiones de búsqueda</Title><Text>Estas métricas se calculan con tus postulaciones e historial. Las sugerencias son revisables: tú decides qué hacer.</Text></Heading>
    <ActionCard action={insights.nextAction} main />
    <Grid>
      <Card><Text>Postulaciones registradas</Text><Number>{insights.totalApplications}</Number></Card>
      <Card><Text>Aplicación → respuesta</Text><Number>{percent(insights.conversions.applicationToResponse)}</Number></Card>
      <Card><Text>Respuesta → entrevista</Text><Number>{percent(insights.conversions.responseToInterview)}</Number></Card>
      <Card><Text>Entrevista → oferta</Text><Number>{percent(insights.conversions.interviewToOffer)}</Number></Card>
    </Grid>
    <Card><strong>Aplicaciones por semana</strong><Rows>{insights.applicationsByWeek.map((item) => <Row key={item.weekOf}><Text>Semana del {item.weekOf}</Text><Number>{item.count}</Number></Row>)}</Rows></Card>
    <Grid>
      <Card><strong>Por fuente</strong><Rows>{insights.bySource.filter((item) => item.total > 0).map((item) => <Row key={item.source}><Text>{item.source}</Text><Text>{item.total} · {percent(item.responseRate)} respuesta</Text></Row>)}{!insights.bySource.some((item) => item.total) && <Text>Aún no hay postulaciones registradas.</Text>}</Rows></Card>
      <Card><strong>Por tipo</strong><Rows>{insights.byType.map((item) => <Row key={item.type}><Text>{item.type === "proactive" ? "Proactiva" : "Reactiva"}</Text><Text>{item.total} · {percent(item.responseRate)} respuesta</Text></Row>)}</Rows></Card>
    </Grid>
    {insights.staleApplications.length > 0 && <Card><strong>Seguimiento pendiente</strong><Rows>{insights.staleApplications.map((item) => <Row key={item.id}><Text>{item.companyName} · {item.roleTitle}</Text><Button as={Link} href="/employment/applications" variant="ghost">Actualizar estatus</Button></Row>)}</Rows></Card>}
    {insights.recommendations.length > 0 && <Grid>{insights.recommendations.map((action) => <ActionCard key={action.title} action={action} />)}</Grid>}
  </Page>;
}
