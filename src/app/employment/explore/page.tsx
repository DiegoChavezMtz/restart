"use client";

import Link from "next/link";
import { useState } from "react";
import styled from "styled-components";
import { Badge } from "@/presentation/atoms/Badge";
import { Button } from "@/presentation/atoms/Button";
import { Input } from "@/presentation/atoms/Input";
import { mockExplorationMessages, mockInsights, type MockExplorationMessage } from "@/presentation/mock/employmentMock";

const Page = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.lg};
  max-width: 720px;
`;

const Heading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
`;

const HeadingText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const Title = styled.h1`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.xl};
`;

const Subtitle = styled.p`
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
`;

const ChatCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 16px;
  background: ${(props) => props.theme.colors.surface};
  overflow: hidden;
`;

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.md};
  padding: ${(props) => props.theme.spacing.xl};
  min-height: 320px;
  max-height: 480px;
  overflow-y: auto;
`;

const Bubble = styled.div<{ $role: "assistant" | "user" }>`
  align-self: ${(props) => (props.$role === "user" ? "flex-end" : "flex-start")};
  max-width: 80%;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 14px;
  line-height: ${(props) => props.theme.typography.lineHeight.relaxed};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  background: ${(props) => (props.$role === "user" ? props.theme.colors.primary : props.theme.colors.surfaceElevated)};
  color: ${(props) => (props.$role === "user" ? props.theme.colors.background : props.theme.colors.textPrimary)};
  border-bottom-right-radius: ${(props) => (props.$role === "user" ? "4px" : "14px")};
  border-bottom-left-radius: ${(props) => (props.$role === "assistant" ? "4px" : "14px")};
`;

const Composer = styled.form`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.md};
  border-top: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surfaceElevated};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
`;

const Hint = styled.span`
  color: ${(props) => props.theme.colors.textTertiary};
  font-size: ${(props) => props.theme.typography.fontSize.xs};
`;

const CANNED_REPLIES = [
  "Gracias por compartirlo. ¿En qué momento del día sientes que rindes más?",
  "¿Prefieres trabajar solo, en equipo, o depende de la tarea?",
  "Cuéntame de una vez que alguien te haya pedido ayuda con algo específico — ¿qué te pidieron?",
];

let replyIndex = 0;

export default function ExplorePage() {
  const [messages, setMessages] = useState<MockExplorationMessage[]>(mockExplorationMessages);
  const [draft, setDraft] = useState("");
  const pendingInsights = mockInsights.filter((i) => i.status === "pending_review").length;

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;

    const userMessage: MockExplorationMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: draft,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: MockExplorationMessage = {
      id: `msg-${Date.now() + 1}`,
      role: "assistant",
      content: CANNED_REPLIES[replyIndex % CANNED_REPLIES.length],
      createdAt: new Date().toISOString(),
    };
    replyIndex += 1;

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft("");
  }

  return (
    <Page>
      <Heading>
        <HeadingText>
          <Title>Descúbrete</Title>
          <Subtitle>
            Platica en tus propias palabras. Cada sesión se guarda y, cuando encontremos algo útil sobre ti, te lo
            mostraremos para que decidas si lo agregamos a tu perfil.
          </Subtitle>
        </HeadingText>
        <Button as={Link} href="/employment/explore/insights" variant="secondary">
          Ver hallazgos {pendingInsights > 0 && <Badge tone="info">{pendingInsights}</Badge>}
        </Button>
      </Heading>

      <ChatCard>
        <MessageList>
          {messages.map((message) => (
            <Bubble key={message.id} $role={message.role}>
              {message.content}
            </Bubble>
          ))}
        </MessageList>
        <Composer onSubmit={handleSend}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe tu respuesta…"
            aria-label="Escribe tu respuesta"
          />
          <Button type="submit">Enviar</Button>
        </Composer>
      </ChatCard>

      <Footer>
        <Hint>Sesión activa · se guarda automáticamente</Hint>
        <Button variant="ghost">Pausar por hoy</Button>
      </Footer>
    </Page>
  );
}
