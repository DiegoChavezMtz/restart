"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { ParticipantLayout } from "@/presentation/templates/ParticipantLayout";
import { RequireAuth } from "@/presentation/state/RequireAuth";
import type { BadgeAssertion, BadgeClass } from "@/domain/entities";
import * as badgeService from "@/presentation/services/badgeService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xl};
  max-width: 900px;
`;

const Title = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${(props) => props.theme.spacing.lg};
`;

const Card = styled.article`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.lg};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
  text-align: center;
`;

const Image = styled.img`
  width: 96px;
  height: 96px;
  object-fit: contain;
`;

const BadgeName = styled.p`
  color: ${(props) => props.theme.colors.textPrimary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

const IssuedAt = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
`;

type LoadState = "loading" | "loaded" | "error";

export default function MyBadgesPage() {
  return (
    <RequireAuth>
      <ParticipantLayout>
        <MyBadgesContent />
      </ParticipantLayout>
    </RequireAuth>
  );
}

function MyBadgesContent() {
  const [assertions, setAssertions] = useState<Array<BadgeAssertion & { badgeClass: BadgeClass }>>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    badgeService
      .listMyBadges()
      .then((items) => {
        setAssertions(items.filter((a) => a.status === "active"));
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, []);

  return (
    <Page>
      <Title>Mis insignias</Title>

      {loadState === "loading" && <LoadingState label="Cargando insignias…" />}
      {loadState === "error" && (
        <EmptyState title="No fue posible cargar tus insignias" description="Actualiza la página para volver a intentarlo." />
      )}
      {loadState === "loaded" && assertions.length === 0 && (
        <EmptyState title="Aún no tienes insignias" description="Cuando completes un taller o actividad, tu insignia aparecerá aquí." />
      )}
      {loadState === "loaded" && assertions.length > 0 && (
        <Grid>
          {assertions.map((assertion) => (
            <Card key={assertion.id}>
              {assertion.badgeClass.imageUrl && <Image src={assertion.badgeClass.imageUrl} alt="" />}
              <BadgeName>{assertion.badgeClass.name}</BadgeName>
              <IssuedAt>Otorgada el {new Date(assertion.issuedAt).toLocaleDateString()}</IssuedAt>
              <Button
                as="a"
                href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
                  assertion.badgeClass.name
                )}&organizationName=${encodeURIComponent("JCF / Restart")}&certUrl=${encodeURIComponent(
                  `${typeof window !== "undefined" ? window.location.origin : ""}/badges/verify/${assertion.id}`
                )}&certId=${encodeURIComponent(assertion.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
              >
                Agregar a LinkedIn
              </Button>
            </Card>
          ))}
        </Grid>
      )}
    </Page>
  );
}
