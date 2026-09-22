"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import * as evaluationService from "@/presentation/services/evaluationService";

const Page=styled.section`display:flex;flex-direction:column;gap:${p=>p.theme.spacing.xl};max-width:900px;`;const Title=styled.h1`font-size:${p=>p.theme.typography.fontSize.xl};color:${p=>p.theme.colors.textPrimary};`;const Meta=styled.p`color:${p=>p.theme.colors.textSecondary};`;const Card=styled.article`display:grid;grid-template-columns:1fr auto;gap:${p=>p.theme.spacing.md};padding:${p=>p.theme.spacing.lg};border:1px solid ${p=>p.theme.colors.border};border-radius:16px;background:${p=>p.theme.colors.surface};@media(max-width:640px){grid-template-columns:1fr;}`;
function date(value:string){return new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(`${value}T00:00:00Z`));}

export default function ParticipantEvaluationsPage(){const [items,setItems]=useState<evaluationService.ParticipantEvaluation[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);useEffect(()=>{evaluationService.listEvaluations().then(data=>setItems(data as evaluationService.ParticipantEvaluation[])).catch(()=>setError("No se pudieron cargar tus evaluaciones.")).finally(()=>setLoading(false));},[]);async function download(item:evaluationService.ParticipantEvaluation){try{await evaluationService.openEvaluationPdf(item.evaluation.id,item.assignmentId);}catch{setError("No se pudo preparar la descarga.");}}return <Page><div><Button as={Link} href="/respond" variant="ghost">← Mi espacio</Button><Title>Mis evaluaciones</Title><Meta>Consulta las evaluaciones de tu cohorte por periodo.</Meta></div>{error&&<FormStatusMessage variant="error">{error}</FormStatusMessage>}{loading?<LoadingState label="Cargando tus evaluaciones…"/>:items.length===0?<EmptyState title="Aún no tienes evaluaciones" description="Cuando te asignen una, aparecerá aquí."/>:items.map(item=><Card key={item.assignmentId}><div><strong>{item.evaluation.title}</strong><Meta>{date(item.evaluation.periodStart)} al {date(item.evaluation.periodEnd)}</Meta>{item.result?<Badge tone="success">Calificación: {item.result.score}/100</Badge>:<Badge tone="warning">Pendiente de evaluación</Badge>}</div>{item.result?<Button onClick={()=>download(item)}>Ver evaluación</Button>:null}</Card>)}</Page>;}
