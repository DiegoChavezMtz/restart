"use client";

import styled from "styled-components";

export interface LogoProps {
  size?: "default" | "compact";
}

const SIZES = {
  default: "40px",
  compact: "28px",
} as const;

const Image = styled.img<{ $size: "default" | "compact" }>`
  display: block;
  height: ${(props) => SIZES[props.$size]};
  width: auto;
`;

export function Logo({ size = "default" }: LogoProps) {
  return <Image src="/branding/restart-logo.png" alt="Restart by Dekids" $size={size} />;
}
