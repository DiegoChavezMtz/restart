import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type {
  GetReportDataForCohortFormResult,
  ParticipantReportEntry,
  QuestionBreakdown,
} from "@/application/use-cases/reports/GetReportDataForCohortForm";

// Paleta de marca, con fondo claro para impresión (el tema de la app es
// oscuro y no es adecuado para un documento pensado para imprimirse).
const COLORS = {
  primary: "#E8384F",
  ink: "#1A1A24",
  inkSecondary: "#5C5C68",
  border: "#E2E2E8",
  surface: "#F7F7FA",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "Sin responder";
  if (Array.isArray(value)) return value.map((v) => escapeHtml(String(v))).join(", ");
  return escapeHtml(String(value));
}

function renderBreakdownItem(item: QuestionBreakdown): string {
  const { question, likert, choice, openText } = item;
  let detail = "";
  if (likert) {
    detail = `Promedio: ${likert.average} · Sin respuesta: ${likert.noAnswerCount}`;
  } else if (choice) {
    detail = choice.optionPercentages.map((o) => `${escapeHtml(o.option)}: ${o.percent}%`).join(" · ");
  } else if (openText) {
    detail = `${openText.answers.length} respuesta(s) de texto abierto · Sin respuesta: ${openText.noAnswerCount}`;
  }
  return `
    <div class="breakdown-item">
      <p class="breakdown-question">${escapeHtml(question.label)}</p>
      <p class="breakdown-detail">${detail}</p>
    </div>
  `;
}

function renderGenerationPage(
  data: GetReportDataForCohortFormResult,
  globalInterpretation: string
): string {
  return `
    <section class="page">
      <p class="eyebrow">Restart · Reporte de generación</p>
      <h1>${escapeHtml(data.cohort.name)}</h1>
      <p class="subtitle">Formulario: ${escapeHtml(data.form.title)}</p>
      <p class="meta">Generado el ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>

      <div class="stat-row">
        <div class="stat">
          <p class="stat-value">${data.totalParticipants}</p>
          <p class="stat-label">Participantes</p>
        </div>
        <div class="stat">
          <p class="stat-value">${data.completedCount}</p>
          <p class="stat-label">Completaron</p>
        </div>
        <div class="stat">
          <p class="stat-value">${data.completionRate}%</p>
          <p class="stat-label">Finalización</p>
        </div>
      </div>

      <h2>Interpretación general</h2>
      <p class="interpretation">${escapeHtml(globalInterpretation)}</p>

      <h2>Desglose por pregunta</h2>
      <div class="breakdown-grid">
        ${data.breakdown.map(renderBreakdownItem).join("")}
      </div>
    </section>
  `;
}

function renderParticipantPage(
  entry: ParticipantReportEntry,
  formTitle: string,
  interpretation: string
): string {
  const statusLabel =
    entry.responseStatus === "completed"
      ? "Completó el formulario"
      : entry.responseStatus === "in_progress"
        ? "En progreso"
        : "No respondió";

  return `
    <section class="page">
      <p class="eyebrow">Restart · Reporte individual</p>
      <h1>${escapeHtml(entry.participant.fullName)}</h1>
      <p class="subtitle">Formulario: ${escapeHtml(formTitle)}</p>
      <p class="meta">${statusLabel}${entry.submittedAt ? ` · ${new Date(entry.submittedAt).toLocaleDateString("es-MX")}` : ""}</p>

      <h2>Interpretación individual</h2>
      <p class="interpretation">${escapeHtml(interpretation)}</p>

      <h2>Respuestas</h2>
      <table class="answers-table">
        <thead>
          <tr><th>Pregunta</th><th>Respuesta</th></tr>
        </thead>
        <tbody>
          ${entry.answers
            .map(
              (a) =>
                `<tr><td>${escapeHtml(a.question.label)}</td><td>${formatAnswerValue(a.value)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function buildHtml(input: {
  data: GetReportDataForCohortFormResult;
  globalInterpretation: string;
  individualInterpretations: Map<string, string>;
}): string {
  const { data, globalInterpretation, individualInterpretations } = input;

  const pages = [
    renderGenerationPage(data, globalInterpretation),
    ...data.participants.map((entry) =>
      renderParticipantPage(
        entry,
        data.form.title,
        individualInterpretations.get(entry.participant.id) ?? ""
      )
    ),
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: ${COLORS.ink};
  }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .eyebrow {
    margin: 0 0 4px;
    color: ${COLORS.primary};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 { margin: 0 0 4px; font-size: 26px; }
  h2 { margin: 24px 0 8px; font-size: 16px; color: ${COLORS.ink}; }
  .subtitle { margin: 0 0 2px; font-size: 14px; color: ${COLORS.inkSecondary}; }
  .meta { margin: 0; font-size: 12px; color: ${COLORS.inkSecondary}; }
  .interpretation { font-size: 13px; line-height: 1.6; color: ${COLORS.ink}; }
  .stat-row { display: flex; gap: 16px; margin-top: 20px; }
  .stat {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid ${COLORS.border};
    border-radius: 10px;
    background: ${COLORS.surface};
  }
  .stat-value { margin: 0; font-size: 22px; font-weight: 700; }
  .stat-label { margin: 0; font-size: 11px; color: ${COLORS.inkSecondary}; text-transform: uppercase; letter-spacing: 0.06em; }
  .breakdown-grid { display: flex; flex-direction: column; gap: 8px; }
  .breakdown-item {
    padding: 10px 12px;
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
  }
  .breakdown-question { margin: 0 0 2px; font-size: 12px; font-weight: 600; }
  .breakdown-detail { margin: 0; font-size: 11px; color: ${COLORS.inkSecondary}; }
  .answers-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .answers-table th, .answers-table td {
    text-align: left;
    padding: 6px 8px;
    border-bottom: 1px solid ${COLORS.border};
  }
  .answers-table th { color: ${COLORS.inkSecondary}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
</head>
<body>
  ${pages.join("\n")}
</body>
</html>`;
}

// @sparticuz/chromium empaqueta un binario de Chromium para Linux/Lambda —
// solo funciona en el entorno serverless real (Vercel). En desarrollo local
// (Mac/Windows) usamos el Chrome ya instalado en la máquina.
async function launchBrowser() {
  if (process.env.VERCEL) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return puppeteer.launch({ channel: "chrome", headless: true });
}

export async function buildReportPdf(input: {
  data: GetReportDataForCohortFormResult;
  globalInterpretation: string;
  individualInterpretations: Map<string, string>;
}): Promise<Buffer> {
  const html = buildHtml(input);

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfUint8 = await page.pdf({ format: "A4", printBackground: true });
    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
  }
}
