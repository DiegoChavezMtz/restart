"use client";

import styled from "styled-components";

export interface LogoProps {
  size?: "default" | "compact";
}

// Bespoke wordmark sizing — deliberately not on the typography token scale
// (sm/md/lg/xl), since these two sizes exist only for this exact lockup.
const SIZES = {
  default: { line1: "26px", line2: "13px", reservedBottom: "18px" },
  compact: { line1: "18px", line2: "11px", reservedBottom: "14px" },
} as const;

const Wrapper = styled.div<{ $size: "default" | "compact" }>`
  display: inline-block;
  line-height: 1.1;
  padding-bottom: ${(props) => SIZES[props.$size].reservedBottom};
`;

const Line1 = styled.span<{ $size: "default" | "compact" }>`
  font-size: ${(props) => SIZES[props.$size].line1};
  color: ${(props) => props.theme.colors.primary};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
`;

// Inline positioning anchor for exactly where "Res" ends and "tart" begins —
// "by Dekids" is absolutely positioned against THIS element, so it lines up
// with the "t" without ever measuring text width in JS (which would cause a
// layout flash on mount).
const AnchorPoint = styled.span`
  position: relative;
  display: inline-block;
`;

const Line2 = styled.span<{ $size: "default" | "compact" }>`
  position: absolute;
  top: 100%;
  left: 0;
  white-space: nowrap;
  font-size: ${(props) => SIZES[props.$size].line2};
  font-weight: ${(props) => props.theme.typography.fontWeight.regular};
  color: ${(props) => props.theme.colors.textSecondary};
`;

export function Logo({ size = "default" }: LogoProps) {
  return (
    <Wrapper $size={size} role="img" aria-label="Restart by Dekids">
      <Line1 $size={size} aria-hidden="true">Res<AnchorPoint>tart<Line2 $size={size}>by Dekids</Line2></AnchorPoint></Line1>
    </Wrapper>
  );
}
