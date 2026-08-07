"use client";

import styled from "styled-components";

export const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 12px;
  background: ${(props) => props.theme.colors.surface};
`;

export const Table = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
`;

export const Thead = styled.thead`
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
  border-bottom: 1px solid ${(props) => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export const Th = styled.th`
  text-align: left;
  padding: ${(props) => props.theme.spacing.md};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  color: ${(props) => props.theme.colors.textSecondary};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
`;

export const Td = styled.td`
  padding: ${(props) => props.theme.spacing.md};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  color: ${(props) => props.theme.colors.textPrimary};
`;
