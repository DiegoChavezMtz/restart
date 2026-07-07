"use client";

import styled from "styled-components";

export const Radio = styled.input.attrs({ type: "radio" })`
  width: 16px;
  height: 16px;
  accent-color: ${(props) => props.theme.colors.primary};
  cursor: pointer;
`;
