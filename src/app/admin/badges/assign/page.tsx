"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Select } from "@/presentation/atoms/Select";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormField } from "@/presentation/molecules/FormField";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import type { BadgeClass, Cohort } from "@/domain/entities";
import type { BadgeCandidate } from "@/domain/repositories";
import * as badgeService from "@/presentation/services/badgeService";
import * as cohortService from "@/presentation/services/cohortService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 900px;
`;

const BackLink = styled(Link)`
  width: fit-content;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};

  &:hover {
    color: ${(props) => props.theme.colors.textPrimary};
  }
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Selectors = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${(props) => props.theme.spacing.md};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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

export default function AssignBadgePage() {
  return (
    <Suspense fallback={<LoadingState label="Cargando…" />}>
      <AssignBadgePageContent />
    </Suspense>
  );
}

function AssignBadgePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const badgeClassId = searchParams.get("badgeClassId") ?? "";
  const cohortIdParam = searchParams.get("cohortId") ?? "";

  const [badgeClasses, setBadgeClasses] = useState<BadgeClass[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [candidates, setCandidates] = useState<BadgeCandidate[]>([]);
  const [hasLoadedCandidates, setHasLoadedCandidates] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([badgeService.listBadgeClasses(), cohortService.listCohorts()])
      .then(([classes, cohortList]) => {
        setBadgeClasses(classes);
        setCohorts(cohortList);
      })
      .catch(() => setError("No se pudieron cargar las insignias y cohortes."));
  }, []);

  const reloadCandidates = useCallback(() => {
    if (!badgeClassId || !cohortIdParam) return;
    badgeService
      .getCohortCandidatesForBadge(cohortIdParam, badgeClassId)
      .then(({ candidates: items }) => {
        setCandidates(items);
        setHasLoadedCandidates(true);
      })
      .catch(() => setError("No se pudo cargar la lista de participantes de esta cohorte."));
  }, [badgeClassId, cohortIdParam]);

  useEffect(() => {
    reloadCandidates();
  }, [reloadCandidates]);

  function updateQuery(next: { badgeClassId?: string; cohortId?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.badgeClassId !== undefined) params.set("badgeClassId", next.badgeClassId);
    if (next.cohortId !== undefined) params.set("cohortId", next.cohortId);
    router.replace(`/admin/badges/assign?${params.toString()}`);
  }

  async function handleGrant(userId: string) {
    setError(null);
    setBusyUserId(userId);
    try {
      await badgeService.issueBadgeAssertions(badgeClassId, [userId]);
      reloadCandidates();
    } catch {
      setError("No se pudo otorgar la insignia. Puede que ya la tenga.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleRevoke(assertionId: string) {
    setError(null);
    setBusyUserId(assertionId);
    try {
      await badgeService.revokeBadgeAssertion(assertionId);
      reloadCandidates();
    } catch {
      setError("No se pudo revocar la insignia.");
    } finally {
      setBusyUserId(null);
    }
  }

  const pendingUserIds = candidates.filter((c) => !c.assertion || c.assertion.status === "revoked").map((c) => c.user.id);

  async function handleGrantAllPending() {
    if (pendingUserIds.length === 0) return;
    setError(null);
    setBusyUserId("__bulk__");
    try {
      await badgeService.issueBadgeAssertions(badgeClassId, pendingUserIds);
      reloadCandidates();
    } catch {
      setError("No se pudo otorgar la insignia a todos los pendientes.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <Page>
      <BackLink href="/admin/badges">← Todas las insignias</BackLink>
      <Title>Otorgar insignia</Title>

      <Selectors>
        <FormField label="Insignia" htmlFor="badge-class-select">
          <Select
            id="badge-class-select"
            value={badgeClassId}
            onChange={(e) => updateQuery({ badgeClassId: e.target.value })}
          >
            <option value="" disabled>Elige una insignia</option>
            {badgeClasses.map((bc) => (
              <option key={bc.id} value={bc.id}>{bc.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Cohorte" htmlFor="cohort-select">
          <Select
            id="cohort-select"
            value={cohortIdParam}
            onChange={(e) => updateQuery({ cohortId: e.target.value })}
          >
            <option value="" disabled>Elige una cohorte</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>{cohort.name}</option>
            ))}
          </Select>
        </FormField>
      </Selectors>

      {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}

      {badgeClassId && cohortIdParam && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>{candidates.length} {candidates.length === 1 ? "participante" : "participantes"}</span>
            {pendingUserIds.length > 0 && (
              <Button variant="secondary" onClick={handleGrantAllPending} disabled={busyUserId !== null}>
                {busyUserId === "__bulk__" ? "Otorgando…" : `Otorgar a los ${pendingUserIds.length} pendientes`}
              </Button>
            )}
          </div>

          {!hasLoadedCandidates && <LoadingState label="Cargando participantes…" />}
          {hasLoadedCandidates && candidates.length === 0 && (
            <EmptyState title="Esta cohorte no tiene participantes" description="Agrega participantes a la cohorte para poder otorgarles insignias." />
          )}
          {hasLoadedCandidates && candidates.length > 0 && (
            <TableScroll>
              <Table>
                <Thead>
                  <Tr><Th>Nombre</Th><Th>Correo</Th><Th>Estado</Th><Th><span className="sr-only">Acción</span></Th></Tr>
                </Thead>
                <Tbody>
                  {candidates.map(({ user, assertion }) => {
                    const isActive = assertion?.status === "active";
                    const busy = busyUserId === user.id || busyUserId === assertion?.id;
                    return (
                      <Tr key={user.id}>
                        <Td>{user.fullName}</Td>
                        <Td>{user.email}</Td>
                        <Td>
                          {isActive ? (
                            <Badge tone="success">Otorgada {new Date(assertion!.issuedAt).toLocaleDateString()}</Badge>
                          ) : (
                            <Badge tone="neutral">Pendiente</Badge>
                          )}
                        </Td>
                        <Td>
                          {isActive ? (
                            <Button variant="destructive" onClick={() => handleRevoke(assertion!.id)} disabled={busy}>
                              {busy ? "Revocando…" : "Revocar"}
                            </Button>
                          ) : (
                            <Button onClick={() => handleGrant(user.id)} disabled={busy}>
                              {busy ? "Otorgando…" : "Otorgar"}
                            </Button>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableScroll>
          )}
        </Card>
      )}
    </Page>
  );
}
