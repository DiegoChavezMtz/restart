"use client";

import styled from "styled-components";

export const TableScroll = styled.div`
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 12px;
  background: ${(props) => props.theme.colors.surface};

  @media (max-width: 767px) {
    border: 0;
    border-radius: 0;
    background: transparent;
  }
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  @media (max-width: 767px) {
    display: block;
  }
`;

export const Thead = styled.thead`
  border-bottom: 1px solid ${(props) => props.theme.colors.border};

  @media (max-width: 767px) {
    display: none;
  }
`;

export const Tbody = styled.tbody`
  @media (max-width: 767px) {
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.md};
  }
`;

export const Tr = styled.tr`
  border-bottom: 1px solid ${(props) => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 767px) {
    display: block;
    padding: ${(props) => props.theme.spacing.md};
    border: 1px solid ${(props) => props.theme.colors.border};
    border-radius: 12px;
    background: ${(props) => props.theme.colors.surface};
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

  @media (max-width: 767px) {
    display: block;
    padding: ${(props) => props.theme.spacing.sm} 0;
    overflow-wrap: anywhere;

    &[data-label] {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: ${(props) => props.theme.spacing.md};

      &::before {
        content: attr(data-label);
        flex: 0 0 38%;
        color: ${(props) => props.theme.colors.textTertiary};
        font-size: ${(props) => props.theme.typography.fontSize.sm};
      }
    }

    &:first-child {
      padding-top: 0;
    }

    &:last-child {
      padding-bottom: 0;
    }
  }
`;
