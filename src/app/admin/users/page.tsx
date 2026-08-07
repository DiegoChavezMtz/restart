"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import styled from "styled-components";
import type { User, UserRole } from "@/domain/entities";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { Select } from "@/presentation/atoms/Select";
import { Switch } from "@/presentation/atoms/Switch";
import { Table, TableScroll, Tbody, Td, Th, Thead, Tr } from "@/presentation/atoms/Table";
import { EmptyState, LoadingState } from "@/presentation/molecules/AsyncState";
import { FormStatusMessage } from "@/presentation/molecules/FormStatusMessage";
import { ConfirmActionDialog } from "@/presentation/molecules/ConfirmActionDialog";
import { FormField } from "@/presentation/molecules/FormField";
import { Modal } from "@/presentation/atoms/Modal";
import { useAuth } from "@/presentation/state/AuthContext";
import * as userManagement from "@/presentation/services/userManagementService";

const Page = styled.div`display: flex; flex-direction: column; gap: ${(p) => p.theme.spacing.xl};`;
const Intro = styled.p`max-width: 76ch; color: ${(p) => p.theme.colors.textSecondary}; line-height: ${(p) => p.theme.typography.lineHeight.relaxed};`;
const Card = styled.section`padding: ${(p) => p.theme.spacing.xl}; border: 1px solid ${(p) => p.theme.colors.border}; border-radius: 16px; background: ${(p) => p.theme.colors.surface};`;
const Name = styled.strong`display: block; color: ${(p) => p.theme.colors.textPrimary};`;
const Meta = styled.span`color: ${(p) => p.theme.colors.textSecondary}; font-size: ${(p) => p.theme.typography.fontSize.sm};`;
const RoleCell = styled.div`min-width: 150px;`;
const CapabilityPanel = styled.div`display: flex; flex-wrap: wrap; gap: ${(p) => p.theme.spacing.md}; margin-top: ${(p) => p.theme.spacing.md}; padding: ${(p) => p.theme.spacing.md}; border-radius: 10px; background: ${(p) => p.theme.colors.surfaceElevated};`;
const Capability = styled.label`display: flex; align-items: center; gap: ${(p) => p.theme.spacing.sm}; color: ${(p) => p.theme.colors.textSecondary}; font-size: ${(p) => p.theme.typography.fontSize.sm};`;
const ActionGroup = styled.div`display: flex; flex-wrap: wrap; gap: ${(p) => p.theme.spacing.sm};`;
const ModalContent = styled.form`display: flex; flex-direction: column; gap: ${(p) => p.theme.spacing.md};`;
const ModalTitle = styled.h2`color: ${(p) => p.theme.colors.textPrimary}; font-size: ${(p) => p.theme.typography.fontSize.lg};`;
const ModalDescription = styled.p`color: ${(p) => p.theme.colors.textSecondary}; line-height: ${(p) => p.theme.typography.lineHeight.relaxed};`;
const ModalActions = styled.div`display: flex; justify-content: flex-end; flex-wrap: wrap; gap: ${(p) => p.theme.spacing.sm};`;

const roleLabels: Record<UserRole, string> = {
  super_admin: "Super admin", admin: "Admin", psicologa: "Psicóloga", usuario: "Usuario", test: "Prueba",
};
const capabilityLabels: Record<userManagement.PsicologaCapability, string> = {
  manage_appointment_availability: "Administrar disponibilidad",
  manage_non_sensitive_appointments: "Gestionar citas no sensibles",
  manage_non_sensitive_internal_forms: "Formularios internos no psicológicos",
};
const capabilities = Object.keys(capabilityLabels) as userManagement.PsicologaCapability[];

export default function UserManagementPage() {
  const { user: actor } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [capabilitiesByUser, setCapabilitiesByUser] = useState<Record<string, userManagement.PsicologaCapability[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{ target: User; input: { role?: UserRole; isActive?: boolean } } | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSuperAdmin = actor?.role === "super_admin";
  const selected = users.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    userManagement.listManagedUsers().then(setUsers).catch(() => setError("No fue posible cargar las cuentas.")).finally(() => setLoading(false));
  }, []);

  async function updateUser(target: User, input: { role?: UserRole; isActive?: boolean }) {
    setError(null); setSuccess(null); setBusy(target.id);
    try {
      await userManagement.updateManagedUser(target.id, input);
      setUsers((current) => current.map((item) => item.id === target.id ? { ...item, ...input } : item));
    } catch (caught) {
      setError((caught as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo actualizar la cuenta.");
    } finally { setBusy(null); }
  }

  async function selectPsychologist(target: User) {
    setSelectedId(target.id); setError(null);
    if (!isSuperAdmin || target.role !== "psicologa" || capabilitiesByUser[target.id]) return;
    try {
      const active = await userManagement.listCapabilities(target.id);
      setCapabilitiesByUser((current) => ({ ...current, [target.id]: active.map((item) => item.capability) }));
    } catch { setError("No fue posible cargar las capacidades de la psicóloga."); }
  }

  async function toggleCapability(capability: userManagement.PsicologaCapability, enabled: boolean) {
    if (!selected) return;
    setError(null); setBusy(`${selected.id}:${capability}`);
    try {
      await userManagement.setCapability(selected.id, capability, enabled);
      setCapabilitiesByUser((current) => ({ ...current, [selected.id]: enabled ? [...(current[selected.id] ?? []), capability] : (current[selected.id] ?? []).filter((item) => item !== capability) }));
    } catch (caught) {
      setError((caught as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo actualizar la capacidad.");
    } finally { setBusy(null); }
  }

  const closePasswordDialog = useCallback(() => {
    if (busy?.startsWith("password:")) return;
    setPasswordTarget(null);
    setNewPassword("");
    setConfirmPassword("");
  }, [busy]);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;
    setError(null); setSuccess(null);
    if (newPassword.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("Las contraseñas no coinciden."); return; }
    setBusy(`password:${passwordTarget.id}`);
    try {
      await userManagement.resetManagedUserPassword(passwordTarget.id, newPassword);
      setSuccess(`La contraseña de ${passwordTarget.email} se actualizó correctamente.`);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (caught) {
      setError((caught as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "No se pudo actualizar la contraseña.");
    } finally { setBusy(null); }
  }

  if (loading) return <LoadingState label="Cargando cuentas…" />;
  return <Page>
    <Intro>Gestiona cuentas operativas sin exponer información clínica. Los cambios se validan nuevamente en Supabase; un admin sólo puede administrar usuarios y cuentas de prueba.</Intro>
    {error && <FormStatusMessage variant="error" role="alert">{error}</FormStatusMessage>}
    {success && <FormStatusMessage variant="success" role="status">{success}</FormStatusMessage>}
    <Card>
      {users.length === 0 ? <EmptyState title="No hay cuentas disponibles" description="Cuando existan perfiles registrados aparecerán aquí." /> : <TableScroll><Table>
        <Thead><Tr><Th>Cuenta</Th><Th>Rol</Th><Th>Activa</Th><Th>Acciones</Th></Tr></Thead>
        <Tbody>{users.map((target) => {
          const canManage = isSuperAdmin || target.role === "usuario" || target.role === "test";
          const roleOptions: UserRole[] = isSuperAdmin ? ["super_admin", "admin", "psicologa", "usuario", "test"] : ["usuario", "test"];
          return <Tr key={target.id}>
            <Td><Name>{target.fullName || "Sin nombre"}</Name><Meta>{target.email} · {target.cohortId ? "Con cohorte" : "Sin cohorte"}</Meta></Td>
            <Td><RoleCell>{canManage && isSuperAdmin ? <Select aria-label={`Rol de ${target.email}`} value={target.role} disabled={busy === target.id} onChange={(event) => setPendingChange({ target, input: { role: event.target.value as UserRole } })}>{roleOptions.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</Select> : <Meta>{roleLabels[target.role]}</Meta>}</RoleCell></Td>
            <Td>{canManage ? <Switch checked={target.isActive} disabled={busy === target.id} onChange={(isActive) => setPendingChange({ target, input: { isActive } })} /> : <Meta>{target.isActive ? "Sí" : "No"}</Meta>}</Td>
            <Td>{isSuperAdmin ? <ActionGroup>
              {target.role === "psicologa" && <Button variant="secondary" onClick={() => selectPsychologist(target)}>Capacidades</Button>}
              <Button variant="secondary" onClick={() => { setError(null); setSuccess(null); setPasswordTarget(target); }}>Restablecer contraseña</Button>
            </ActionGroup> : <Meta>{canManage ? "Gestionable" : "Restringida"}</Meta>}</Td>
          </Tr>;
        })}</Tbody>
      </Table></TableScroll>}
      {isSuperAdmin && selected?.role === "psicologa" && <CapabilityPanel>
        {capabilities.map((capability) => <Capability key={capability}><Switch checked={(capabilitiesByUser[selected.id] ?? []).includes(capability)} disabled={busy === `${selected.id}:${capability}`} onChange={(enabled) => toggleCapability(capability, enabled)} /> {capabilityLabels[capability]}</Capability>)}
      </CapabilityPanel>}
    </Card>
    <ConfirmActionDialog
      open={pendingChange !== null}
      title={pendingChange?.input.role ? "Confirmar cambio de rol" : pendingChange?.input.isActive ? "Reactivar cuenta" : "Desactivar cuenta"}
      description={pendingChange?.input.role ? `Cambiarás el rol de ${pendingChange.target.email} a ${roleLabels[pendingChange.input.role]}.` : `Cambiarás el estado de ${pendingChange?.target.email}.`}
      confirmLabel="Confirmar"
      destructive={pendingChange?.input.isActive === false || (pendingChange?.input.role !== undefined && pendingChange.input.role !== "super_admin" && pendingChange.target.role === "super_admin")}
      isConfirming={pendingChange !== null && busy === pendingChange.target.id}
      onClose={() => setPendingChange(null)}
      onConfirm={async () => { if (!pendingChange) return; await updateUser(pendingChange.target, pendingChange.input); setPendingChange(null); }}
    />
    <Modal open={passwordTarget !== null} onClose={closePasswordDialog} ariaLabel="Restablecer contraseña">
      <ModalContent onSubmit={resetPassword}>
        <ModalTitle>Restablecer contraseña</ModalTitle>
        <ModalDescription>Define una contraseña temporal para {passwordTarget?.email}. La contraseña no se mostrará ni se almacenará fuera de Supabase Auth.</ModalDescription>
        <FormField label="Nueva contraseña" htmlFor="managed-user-password"><Input id="managed-user-password" type="password" name="newPassword" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required disabled={busy?.startsWith("password:")} /></FormField>
        <FormField label="Confirmar contraseña" htmlFor="managed-user-confirm-password"><Input id="managed-user-confirm-password" type="password" name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required disabled={busy?.startsWith("password:")} /></FormField>
        <ModalActions><Button type="button" variant="secondary" onClick={closePasswordDialog} disabled={busy?.startsWith("password:")}>Cancelar</Button><Button type="submit" disabled={busy?.startsWith("password:")}>{busy?.startsWith("password:") ? "Actualizando…" : "Actualizar contraseña"}</Button></ModalActions>
      </ModalContent>
    </Modal>
  </Page>;
}
