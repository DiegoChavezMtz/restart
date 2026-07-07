"use client";

import styled from "styled-components";

export const Checkbox = styled.input.attrs({ type: "checkbox" })`
  width: 16px;
  height: 16px;
  accent-color: ${(props) => props.theme.colors.primary};
  cursor: pointer;
`;
