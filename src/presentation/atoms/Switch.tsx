"use client";

import styled from "styled-components";

const Track = styled.span<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: ${(props) => (props.$checked ? props.theme.colors.primary : props.theme.colors.border)};
  transition: background 0.15s ease;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${(props) => (props.$checked ? "18px" : "2px")};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${(props) => props.theme.colors.background};
    transition: left 0.15s ease;
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;

  &:focus-visible + ${Track} {
    outline: 2px solid ${(props) => props.theme.colors.focus};
    outline-offset: 3px;
  }
`;

const Wrapper = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`;

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <Wrapper>
      <HiddenInput
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Track $checked={checked} />
    </Wrapper>
  );
}
