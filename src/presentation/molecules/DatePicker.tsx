"use client";

import { useState } from "react";
import styled from "styled-components";
import { Button } from "@/presentation/atoms/Button";
import { Modal } from "@/presentation/atoms/Modal";

// Selector de calendario propio en vez de <input type="month"|"date"> nativo:
// Safari de escritorio no soporta type="month" y cae a un input de texto
// libre, lo que permitía mandar fechas en formato inválido (el bug que
// motivó este archivo). Este componente siempre produce "YYYY-MM" o
// "YYYY-MM-DD", sin importar el navegador.

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const WEEKDAY_ABBR = ["L", "M", "M", "J", "V", "S", "D"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Parseo defensivo: cualquier valor que no sea exactamente "YYYY-MM" (año
// de 4 dígitos) se trata como "sin valor" en vez de propagar NaN — nunca
// debe verse el literal "NaN" en pantalla, sin importar de dónde venga el
// valor (prop corrupta, dato viejo, etc.).
function parseYearMonth(value: string): { year: number; monthIndex: number } | null {
  if (!/^\d{4}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const monthIndex = Number(value.slice(5, 7)) - 1;
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function parseYearMonthDay(value: string): { year: number; monthIndex: number; day: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const monthIndex = Number(value.slice(5, 7)) - 1;
  const day = Number(value.slice(8, 10));
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  return { year, monthIndex, day };
}

const Trigger = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.background};
  color: ${(props) => (props.$hasValue ? props.theme.colors.textPrimary : props.theme.colors.textTertiary)};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.colors.borderStrong};
  }

  &:focus-visible {
    outline: none;
    border-color: ${(props) => props.theme.colors.focus};
    box-shadow: 0 0 0 3px color-mix(in srgb, ${(props) => props.theme.colors.focus} 24%, transparent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CalendarIcon = styled.span`
  flex-shrink: 0;
  opacity: 0.6;
`;

const PanelTitle = styled.h2`
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const NavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.md};
  margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const NavLabel = styled.span`
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  font-weight: ${(props) => props.theme.typography.fontWeight.bold};
  color: ${(props) => props.theme.colors.textPrimary};
`;

const NavButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid ${(props) => props.theme.colors.border};
  background: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.lg};
  cursor: pointer;

  &:hover {
    background: ${(props) => props.theme.colors.surfaceHover};
    border-color: ${(props) => props.theme.colors.borderStrong};
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.focus};
    outline-offset: 2px;
  }
`;

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${(props) => props.theme.spacing.sm};
`;

const DayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${(props) => props.theme.spacing.xs};
`;

const WeekdayLabel = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: ${(props) => props.theme.typography.fontSize.xs};
  font-weight: ${(props) => props.theme.typography.fontWeight.medium};
  color: ${(props) => props.theme.colors.textTertiary};
`;

const CellButton = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.border)};
  background: ${(props) => (props.$selected ? props.theme.colors.primary : props.theme.colors.surface)};
  color: ${(props) => (props.$selected ? props.theme.colors.background : props.theme.colors.textPrimary)};
  font-size: ${(props) => props.theme.typography.fontSize.sm};
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${(props) => (props.$selected ? props.theme.colors.primaryHover : props.theme.colors.surfaceHover)};
  }

  &:focus-visible {
    outline: 2px solid ${(props) => props.theme.colors.focus};
    outline-offset: 2px;
  }
`;

const EmptyCell = styled.div``;

const PanelFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${(props) => props.theme.spacing.lg};
`;

export interface MonthFieldProps {
  value: string; // "YYYY-MM" o ""
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MonthField({ value, onChange, disabled, placeholder = "Selecciona mes y año" }: MonthFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseYearMonth(value);
  const [viewYear, setViewYear] = useState(() => parsed?.year ?? new Date().getFullYear());

  const label = parsed ? `${MONTH_NAMES[parsed.monthIndex]} ${parsed.year}` : placeholder;

  function openPicker() {
    if (disabled) return;
    setViewYear(parsed?.year ?? new Date().getFullYear());
    setOpen(true);
  }

  function pick(monthIndex: number) {
    onChange(`${viewYear}-${pad(monthIndex + 1)}`);
    setOpen(false);
  }

  return (
    <>
      <Trigger type="button" onClick={openPicker} disabled={disabled} $hasValue={Boolean(parsed)}>
        <span>{label}</span>
        <CalendarIcon aria-hidden="true">📅</CalendarIcon>
      </Trigger>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Seleccionar mes y año">
        <PanelTitle>Selecciona mes y año</PanelTitle>
        <NavRow>
          <NavButton type="button" onClick={() => setViewYear((y) => y - 1)} aria-label="Año anterior">
            ‹
          </NavButton>
          <NavLabel>{viewYear}</NavLabel>
          <NavButton type="button" onClick={() => setViewYear((y) => y + 1)} aria-label="Año siguiente">
            ›
          </NavButton>
        </NavRow>
        <MonthGrid>
          {MONTH_ABBR.map((abbr, index) => (
            <CellButton
              key={abbr}
              type="button"
              $selected={parsed?.year === viewYear && parsed?.monthIndex === index}
              onClick={() => pick(index)}
            >
              {abbr}
            </CellButton>
          ))}
        </MonthGrid>
        {value && (
          <PanelFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Limpiar
            </Button>
          </PanelFooter>
        )}
      </Modal>
    </>
  );
}

export interface DayFieldProps {
  value: string; // "YYYY-MM-DD" o ""
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function formatDisplayDate(parsed: { year: number; monthIndex: number; day: number }): string {
  return `${parsed.day} de ${MONTH_NAMES[parsed.monthIndex]} de ${parsed.year}`;
}

export function DayField({ value, onChange, disabled, placeholder = "Selecciona una fecha" }: DayFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = parseYearMonthDay(value);
  const [viewYear, setViewYear] = useState(() => parsed?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parsed?.monthIndex ?? new Date().getMonth());

  const label = parsed ? formatDisplayDate(parsed) : placeholder;

  function openPicker() {
    if (disabled) return;
    const now = new Date();
    setViewYear(parsed?.year ?? now.getFullYear());
    setViewMonth(parsed?.monthIndex ?? now.getMonth());
    setOpen(true);
  }

  function changeMonth(delta: number) {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  }

  function pick(day: number) {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // lunes = 0
  const selectedDay = parsed && parsed.year === viewYear && parsed.monthIndex === viewMonth ? parsed.day : null;
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <Trigger type="button" onClick={openPicker} disabled={disabled} $hasValue={Boolean(parsed)}>
        <span>{label}</span>
        <CalendarIcon aria-hidden="true">📅</CalendarIcon>
      </Trigger>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Seleccionar fecha">
        <PanelTitle>Selecciona una fecha</PanelTitle>
        <NavRow>
          <NavButton type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
            ‹
          </NavButton>
          <NavLabel>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </NavLabel>
          <NavButton type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente">
            ›
          </NavButton>
        </NavRow>
        <DayGrid>
          {WEEKDAY_ABBR.map((weekday, index) => (
            <WeekdayLabel key={`${weekday}-${index}`}>{weekday}</WeekdayLabel>
          ))}
          {cells.map((day, index) =>
            day === null ? (
              <EmptyCell key={`empty-${index}`} />
            ) : (
              <CellButton key={day} type="button" $selected={selectedDay === day} onClick={() => pick(day)}>
                {day}
              </CellButton>
            )
          )}
        </DayGrid>
      </Modal>
    </>
  );
}

const RangeMonths = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: ${(props) => props.theme.spacing.xl};
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;
const RangeMonthTitle = styled.h3`
  margin-bottom: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.textPrimary};
  font-size: ${(props) => props.theme.typography.fontSize.md};
  text-align: center;
`;
const RangeDay = styled.button<{ $start: boolean; $end: boolean; $inside: boolean }>`
  min-height: 38px; border: 0; border-radius: ${(p) => p.$start || p.$end ? "999px" : "0"};
  background: ${(p) => p.$start || p.$end ? p.theme.colors.primary : p.$inside ? "color-mix(in srgb, " + p.theme.colors.primary + " 16%, transparent)" : "transparent"};
  color: ${(p) => p.$start || p.$end ? p.theme.colors.background : p.theme.colors.textPrimary};
  cursor: pointer; font: inherit;
  &:hover { background: ${(p) => p.$start || p.$end ? p.theme.colors.primaryHover : p.theme.colors.surfaceHover}; }
  &:focus-visible { outline: 2px solid ${(p) => p.theme.colors.focus}; outline-offset: 1px; }
`;
const RangeSummary = styled.p`
  margin-bottom: ${(props) => props.theme.spacing.lg}; color: ${(props) => props.theme.colors.textSecondary};
`;

export interface DateRangeFieldProps {
  startValue: string;
  endValue: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
}

function addMonths(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Selector de rango con dos meses visibles, pensado para elegir el periodo de una evaluación. */
export function DateRangeField({ startValue, endValue, onChange, disabled }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const start = parseYearMonthDay(startValue);
  const end = parseYearMonthDay(endValue);
  const now = new Date();
  const [view, setView] = useState(() => ({ year: start?.year ?? now.getFullYear(), month: start?.monthIndex ?? now.getMonth() }));
  const label = start && end ? `${formatDisplayDate(start)} — ${formatDisplayDate(end)}` : start ? `${formatDisplayDate(start)} — Selecciona fecha final` : "Selecciona el periodo";
  const choose = (value: string) => {
    if (!startValue || endValue || value < startValue) onChange(value, "");
    else onChange(startValue, value);
  };
  const drawMonth = (year: number, month: number) => {
    const days = new Date(year, month + 1, 0).getDate();
    const first = (new Date(year, month, 1).getDay() + 6) % 7;
    return <div key={`${year}-${month}`}><RangeMonthTitle>{MONTH_NAMES[month]} {year}</RangeMonthTitle><DayGrid>
      {WEEKDAY_ABBR.map((weekday, index) => <WeekdayLabel key={`${weekday}-${index}`}>{weekday}</WeekdayLabel>)}
      {Array.from({ length: first }, (_, i) => <EmptyCell key={`e-${i}`} />)}
      {Array.from({ length: days }, (_, i) => { const value = `${year}-${pad(month + 1)}-${pad(i + 1)}`; return <RangeDay key={value} type="button" $start={value === startValue} $end={value === endValue} $inside={Boolean(startValue && endValue && value > startValue && value < endValue)} onClick={() => choose(value)}>{i + 1}</RangeDay>; })}
    </DayGrid></div>;
  };
  return <><Trigger type="button" onClick={() => { if (!disabled) setOpen(true); }} disabled={disabled} $hasValue={Boolean(start)}><span>{label}</span><CalendarIcon aria-hidden="true">📅</CalendarIcon></Trigger>
    <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Seleccionar periodo de evaluación"><PanelTitle>Periodo de evaluación</PanelTitle><RangeSummary>{!startValue || endValue ? "Elige la fecha de inicio." : "Ahora elige la fecha final."}</RangeSummary>
      <NavRow><NavButton type="button" onClick={() => setView(addMonths(view.year, view.month, -1))} aria-label="Mes anterior">‹</NavButton><NavLabel>Selecciona un rango</NavLabel><NavButton type="button" onClick={() => setView(addMonths(view.year, view.month, 1))} aria-label="Mes siguiente">›</NavButton></NavRow>
      <RangeMonths>{drawMonth(view.year, view.month)}{(() => { const next = addMonths(view.year, view.month, 1); return drawMonth(next.year, next.month); })()}</RangeMonths>
      <PanelFooter><Button type="button" variant="ghost" onClick={() => { onChange("", ""); }}>Limpiar</Button><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Listo</Button></PanelFooter>
    </Modal></>;
}
