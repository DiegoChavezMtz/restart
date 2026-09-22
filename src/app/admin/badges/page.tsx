"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import type { BadgeClass } from "@/domain/entities";
import * as badgeService from "@/presentation/services/badgeService";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xxl};
  max-width: 1080px;
`;

const Intro = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.lg};

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const IntroText = styled.p`
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
`;

const Thumb = styled.img`
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
  background: ${(props) => props.theme.colors.background};
`;

type LoadState = "loading" | "loaded" | "error";

export default function AdminBadgesPage() {
  const [classes, setClasses] = useState<BadgeClass[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    badgeService
      .listBadgeClasses()
      .then((items) => {
        setClasses(items);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, []);

  return (
    <Page>
      <Intro>
        <IntroText>Crea insignias digitales verificables y otórgalas a los participantes de una cohorte.</IntroText>
        <Button as={Link} href="/admin/badges/classes/new">
          Crear insignia
        </Button>
      </Intro>

      <Card>
        {loadState === "loading" && <LoadingState label="Cargando insignias…" />}
        {loadState === "error" && (
          <EmptyState title="No fue posible cargar las insignias" description="Actualiza la página para volver a intentarlo." />
        )}
        {loadState === "loaded" && classes.length === 0 && (
          <EmptyState title="Aún no hay insignias" description="Crea la primera insignia para poder otorgarla a una cohorte." />
        )}
        {loadState === "loaded" && classes.length > 0 && (
          <TableScroll>
            <Table>
              <Thead>
                <Tr><Th><span className="sr-only">Imagen</span></Th><Th>Nombre</Th><Th>Estado</Th><Th><span className="sr-only">Acciones</span></Th></Tr>
              </Thead>
              <Tbody>
                {classes.map((badgeClass) => (
                  <Tr key={badgeClass.id}>
                    <Td>{badgeClass.imageUrl && <Thumb src={badgeClass.imageUrl} alt="" />}</Td>
                    <Td>{badgeClass.name}</Td>
                    <Td><Badge tone={badgeClass.isActive ? "success" : "neutral"}>{badgeClass.isActive ? "Activa" : "Inactiva"}</Badge></Td>
                    <Td>
                      <Button as={Link} href={`/admin/badges/assign?badgeClassId=${badgeClass.id}`} variant="secondary">
                        Otorgar
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </Page>
  );
}
