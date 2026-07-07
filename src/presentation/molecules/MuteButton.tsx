"use client";

import { useSyncExternalStore } from "react";
import styled from "styled-components";
import * as soundService from "@/presentation/services/soundService";

function getServerSnapshot() {
  return false;
}

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s ease;

  &:hover {
    background: ${(props) => props.theme.colors.surfaceElevated};
  }
`;

export function MuteButton() {
  // Sound preference lives in localStorage — useSyncExternalStore keeps this
  // in sync without a hydration mismatch (server always renders "unmuted").
  const muted = useSyncExternalStore(
    soundService.subscribeMuted,
    soundService.isSoundMuted,
    getServerSnapshot
  );

  function toggle() {
    soundService.setSoundMuted(!muted);
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
      title={muted ? "Activar sonido" : "Silenciar sonido"}
    >
      {muted ? "🔇" : "🔊"}
    </Button>
  );
}
