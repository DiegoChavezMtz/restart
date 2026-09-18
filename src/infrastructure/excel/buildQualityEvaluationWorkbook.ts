import ExcelJS from "exceljs";
import type { QualityEvaluationReport, QualityFormReport, QualityMetricResult } from "@/application/use-cases/quality/GetQualityEvaluationReport";

const COLORS = { red: "FFE8384F", ink: "FF1A1A24", muted: "FF5C5C68", line: "FFE2E2E8", soft: "FFF7F7FA", white: "FFFFFFFF" };
const METRIC_KEYS = ["recommendation", "usefulness", "happiness"] as const;

function formatPercent(value: number | null): string {
  return value === null ? "Sin datos" : `${value.toFixed(1)}%`;
}

function styleTitle(sheet: ExcelJS.Worksheet, title: string, columnCount: number) {
  sheet.views = [{ showGridLines: false }];
  sheet.mergeCells(1, 1, 1, columnCount);
  const cell = sheet.getCell(1, 1);
  cell.value = title;
  cell.font = { name: "Arial", size: 16, bold: true, color: { argb: COLORS.ink } };
  cell.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 8;
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.red } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
  });
  row.height = 28;
}

function writeMetricTable(sheet: ExcelJS.Worksheet, startRow: number, metrics: QualityMetricResult[]) {
  const header = sheet.getRow(startRow);
  header.values = ["Dimensión", "Respuestas válidas", "Promedio / 5", "Favorables (4-5)", "% favorable", "1", "2", "3", "4", "5"];
  styleHeader(header);
  metrics.forEach((metric, index) => {
    const row = sheet.getRow(startRow + index + 1);
    row.values = [metric.label, metric.answeredCount, metric.average, metric.favorableCount, metric.favorablePercent === null ? null : metric.favorablePercent / 100, ...metric.distribution.map((entry) => entry.count)];
    row.getCell(3).numFmt = "0.00";
    row.getCell(5).numFmt = "0.0%";
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } };
      cell.alignment = { vertical: "middle", horizontal: cell === row.getCell(1) ? "left" : "center" };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
    });
  });
}

function safeSheetName(title: string, used: Set<string>): string {
  const base = title.replace(/[\\/*?:\[\]]/g, " ").trim().slice(0, 31) || "Formulario";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const marker = ` (${suffix++})`;
    candidate = `${base.slice(0, 31 - marker.length)}${marker}`;
  }
  used.add(candidate);
  return candidate;
}

function writeFormSheet(workbook: ExcelJS.Workbook, report: QualityFormReport, sheetName: string) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = [{ width: 30 }, { width: 17 }, { width: 15 }, { width: 18 }, { width: 15 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }];
  styleTitle(sheet, report.form.title, 10);
  sheet.getCell("A3").value = "Formulario";
  sheet.getCell("B3").value = report.form.title;
  sheet.getCell("A4").value = "Respuestas completadas";
  sheet.getCell("B4").value = report.completedResponseCount;
  sheet.getCell("A5").value = "Fecha de creación";
  sheet.getCell("B5").value = new Date(report.form.createdAt);
  sheet.getCell("B5").numFmt = "dd/mm/yyyy";
  sheet.getCell("A6").value = "Etiquetas";
  sheet.getCell("B6").value = report.form.tags.join(", ");
  ["A3", "A4", "A5", "A6"].forEach((address) => { sheet.getCell(address).font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.muted } }; });
  sheet.getCell("B3").alignment = { wrapText: true };
  sheet.getCell("B6").alignment = { wrapText: true };
  writeMetricTable(sheet, 8, report.metrics);
  sheet.getCell("A13").value = "Criterio de favorabilidad";
  sheet.getCell("A13").font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.ink } };
  report.metrics.forEach((metric, index) => {
    sheet.getCell(14 + index, 1).value = metric.label;
    sheet.getCell(14 + index, 2).value = metric.favorableLabel;
  });
  sheet.getCell("A19").value = "Usuarios que contestaron";
  sheet.getCell("A19").font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  const respondentsHeader = sheet.getRow(20);
  respondentsHeader.values = ["#", "Usuario", "Recomendación", "Utilidad", "Felicidad", "Respuestas válidas", "Promedio / 5", "% favorable"];
  styleHeader(respondentsHeader);
  report.respondents.forEach((respondent, index) => {
    const row = sheet.getRow(21 + index);
    const values = METRIC_KEYS.map((key) => respondent.answers[key]).filter((value): value is number => value !== null);
    const favorableCount = values.filter((value) => value >= 4).length;
    row.values = [index + 1, respondent.fullName, ...METRIC_KEYS.map((key) => respondent.answers[key]), values.length, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, values.length ? favorableCount / values.length : null];
    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(7).numFmt = "0.00";
    row.getCell(8).numFmt = "0.0%";
    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
    });
  });
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 8 }];
}

function writeEvolutionSheet(workbook: ExcelJS.Workbook, report: QualityEvaluationReport) {
  const sheet = workbook.addWorksheet("Evolución");
  sheet.columns = [{ width: 16 }, { width: 34 }, { width: 18 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 4 }, { width: 38 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 4 }, { width: 32 }];
  styleTitle(sheet, "Evolución de resultados", 7);
  const orderedForms = [...report.forms].sort((left, right) => new Date(left.form.createdAt).getTime() - new Date(right.form.createdAt).getTime());
  const users = [...new Map(orderedForms.flatMap((form) => form.respondents.map((respondent) => [respondent.id, respondent] as const))).values()]
    .sort((left, right) => left.fullName.localeCompare(right.fullName, "es-MX", { sensitivity: "base" }));

  sheet.getCell("A3").value = "Usuario seleccionado";
  sheet.getCell("A3").font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.muted } };
  sheet.getCell("B3").value = users[0]?.fullName ?? "Sin usuarios disponibles";
  sheet.getCell("B3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
  sheet.getCell("B3").font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.ink } };
  sheet.getCell("D3").value = "Cambia este valor para consultar el histórico de otro usuario.";
  sheet.getCell("D3").font = { name: "Arial", size: 10, italic: true, color: { argb: COLORS.muted } };

  sheet.getCell("A5").value = "Evolución general por sesión";
  sheet.getCell("A5").font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  const generalHeader = sheet.getRow(6);
  generalHeader.values = ["Fecha", "Formulario", "Respuestas completadas", "Recomendación", "Utilidad", "Felicidad", "Promedio general"];
  styleHeader(generalHeader);
  orderedForms.forEach((form, index) => {
    const row = sheet.getRow(7 + index);
    const metricByKey = new Map(form.metrics.map((metric) => [metric.key, metric]));
    const values = form.metrics.map((metric) => metric.average).filter((value): value is number => value !== null);
    row.values = [new Date(form.form.createdAt), form.form.title, form.completedResponseCount, metricByKey.get("recommendation")?.average ?? null, metricByKey.get("usefulness")?.average ?? null, metricByKey.get("happiness")?.average ?? null, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null];
    row.getCell(1).numFmt = "dd/mm/yyyy";
    [4, 5, 6, 7].forEach((column) => { row.getCell(column).numFmt = "0.00"; });
    row.eachCell((cell) => { cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } }; cell.alignment = { vertical: "middle", wrapText: true }; cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } }; });
  });

  const personalTitleRow = 10 + orderedForms.length;
  sheet.getCell(personalTitleRow, 1).value = "Histórico del usuario seleccionado";
  sheet.getCell(personalTitleRow, 1).font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  const personalHeader = sheet.getRow(personalTitleRow + 1);
  personalHeader.values = ["Fecha", "Formulario", "Recomendación", "Utilidad", "Felicidad", "Promedio / 5"];
  styleHeader(personalHeader);
  const sourceStartRow = 6;
  const sourceRows = orderedForms.flatMap((form) => form.respondents.map((respondent) => ({ form, respondent })));
  const sourceEndRow = Math.max(sourceStartRow, sourceStartRow + sourceRows.length - 1);
  orderedForms.forEach((form, index) => {
    const rowNumber = personalTitleRow + 2 + index;
    const row = sheet.getRow(rowNumber);
    row.values = [new Date(form.form.createdAt), form.form.title];
    row.getCell(1).numFmt = "dd/mm/yyyy";
    [3, 4, 5].forEach((column) => {
      const sourceColumn = ["O", "P", "Q"][column - 3];
      row.getCell(column).value = { formula: `IF(COUNTIFS($L$${sourceStartRow}:$L$${sourceEndRow},A${rowNumber},$N$${sourceStartRow}:$N$${sourceEndRow},$B$3)=0,"",SUMIFS($${sourceColumn}$${sourceStartRow}:$${sourceColumn}$${sourceEndRow},$L$${sourceStartRow}:$L$${sourceEndRow},A${rowNumber},$N$${sourceStartRow}:$N$${sourceEndRow},$B$3))` };
      row.getCell(column).numFmt = "0.00";
    });
    row.getCell(6).value = { formula: `IF(COUNT(C${rowNumber}:E${rowNumber})=0,"",AVERAGE(C${rowNumber}:E${rowNumber}))` };
    row.getCell(6).numFmt = "0.00";
    row.eachCell((cell) => { cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } }; cell.alignment = { vertical: "middle", wrapText: true }; cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } }; });
  });

  const instructionsRow = personalTitleRow + orderedForms.length + 4;
  sheet.getCell(instructionsRow, 1).value = "Cómo crear las gráficas en Excel";
  sheet.getCell(instructionsRow, 1).font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  const instructions = [
    `General: selecciona A6:G${6 + orderedForms.length} y usa Insertar > Gráfico de líneas. Para una lectura simple, conserva solo “Promedio general” como serie.`,
    `Usuario: selecciona A${personalTitleRow + 1}:F${personalTitleRow + 1 + orderedForms.length} y usa Insertar > Gráfico de líneas. Cambia el usuario en B3 para actualizar las fórmulas y el gráfico.`,
  ];
  instructions.forEach((instruction, index) => {
    sheet.mergeCells(instructionsRow + index + 1, 1, instructionsRow + index + 1, 7);
    const cell = sheet.getCell(instructionsRow + index + 1, 1);
    cell.value = instruction;
    cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } };
    cell.alignment = { wrapText: true, vertical: "top" };
  });

  sheet.getCell("L3").value = "Datos fuente del histórico";
  sheet.getCell("L3").font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.muted } };
  const sourceHeader = sheet.getRow(5);
  ["Fecha", "Formulario", "Usuario", "Recomendación", "Utilidad", "Felicidad"].forEach((label, index) => { sourceHeader.getCell(12 + index).value = label; });
  for (let column = 12; column <= 17; column += 1) {
    const cell = sourceHeader.getCell(column);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.red } };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
  }
  sourceRows.forEach(({ form, respondent }, index) => {
    const row = sheet.getRow(sourceStartRow + index);
    row.getCell(12).value = new Date(form.form.createdAt);
    row.getCell(12).numFmt = "dd/mm/yyyy";
    row.getCell(13).value = form.form.title;
    row.getCell(14).value = respondent.fullName;
    row.getCell(15).value = respondent.answers.recommendation;
    row.getCell(16).value = respondent.answers.usefulness;
    row.getCell(17).value = respondent.answers.happiness;
  });
  sheet.getCell("T3").value = "Usuarios disponibles";
  sheet.getCell("T3").font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.muted } };
  users.forEach((user, index) => { sheet.getCell(5 + index, 20).value = user.fullName; });
  if (users.length > 0) sheet.getCell("B3").dataValidation = { type: "list", allowBlank: false, formulae: [`$T$5:$T$${4 + users.length}`] };
  sheet.views = [{ showGridLines: false, state: "frozen", ySplit: 6 }];
}

export async function buildQualityEvaluationWorkbook(input: { report: QualityEvaluationReport; interpretation: string }): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Restart";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [{ width: 30 }, { width: 18 }, { width: 17 }, { width: 18 }, { width: 15 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 }];
  styleTitle(summary, "Reporte de evaluación Restart", 10);
  summary.getCell("A3").value = "Generado";
  summary.getCell("B3").value = new Date();
  summary.getCell("B3").numFmt = "dd/mm/yyyy hh:mm";
  summary.getCell("A4").value = "Formularios incluidos";
  summary.getCell("B4").value = input.report.forms.length;
  summary.getCell("A5").value = "Respuestas completadas";
  summary.getCell("B5").value = input.report.completedResponseCount;
  ["A3", "A4", "A5"].forEach((address) => { summary.getCell(address).font = { name: "Arial", size: 10, bold: true, color: { argb: COLORS.muted } }; });
  summary.getCell("A7").value = "Resultados generales";
  summary.getCell("A7").font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  writeMetricTable(summary, 8, input.report.metrics);
  summary.getCell("A14").value = "Interpretación asistida por IA";
  summary.getCell("A14").font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  summary.mergeCells("A15:J19");
  const interpretationCell = summary.getCell("A15");
  interpretationCell.value = input.interpretation;
  interpretationCell.alignment = { wrapText: true, vertical: "top" };
  interpretationCell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } };
  interpretationCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.soft } };
  summary.getRow(15).height = 120;
  summary.getCell("A21").value = "Formularios incluidos";
  summary.getCell("A21").font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  const formHeader = summary.getRow(22);
  formHeader.values = ["Formulario", "Creado", "Respuestas completadas", "Recomendación", "Utilidad percibida", "Felicidad en Restart"];
  styleHeader(formHeader);
  input.report.forms.forEach((form, index) => {
    const row = summary.getRow(23 + index);
    row.values = [form.form.title, new Date(form.form.createdAt), form.completedResponseCount, ...form.metrics.map((metric) => formatPercent(metric.favorablePercent))];
    row.getCell(2).numFmt = "dd/mm/yyyy";
    row.eachCell((cell) => { cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } }; cell.alignment = { vertical: "middle", wrapText: true }; });
  });
  const respondentForms = new Map<string, { fullName: string; forms: string[]; answers: number[]; byMetric: Record<string, number[]> }>();
  input.report.forms.forEach((form) => form.respondents.forEach((respondent) => {
    const entry = respondentForms.get(respondent.id) ?? { fullName: respondent.fullName, forms: [], answers: [], byMetric: { recommendation: [], usefulness: [], happiness: [] } };
    entry.forms.push(form.form.title);
    METRIC_KEYS.forEach((key) => {
      const value = respondent.answers[key];
      if (value !== null) { entry.answers.push(value); entry.byMetric[key].push(value); }
    });
    respondentForms.set(respondent.id, entry);
  }));
  const userSectionRow = 25 + input.report.forms.length;
  summary.getCell(userSectionRow, 1).value = "Resumen por usuario";
  summary.getCell(userSectionRow, 1).font = { name: "Arial", size: 12, bold: true, color: { argb: COLORS.ink } };
  const userHeader = summary.getRow(userSectionRow + 1);
  userHeader.values = ["Usuario", "Formularios contestados", "Respuestas válidas", "Promedio / 5", "% favorable", "Recomendación", "Utilidad", "Felicidad", "Formularios"];
  styleHeader(userHeader);
  [...respondentForms.values()].sort((left, right) => left.fullName.localeCompare(right.fullName, "es-MX", { sensitivity: "base" })).forEach((user, index) => {
    const row = summary.getRow(userSectionRow + 2 + index);
    const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const allAverage = average(user.answers);
    row.values = [user.fullName, user.forms.length, user.answers.length, allAverage, user.answers.length ? user.answers.filter((value) => value >= 4).length / user.answers.length : null, average(user.byMetric.recommendation), average(user.byMetric.usefulness), average(user.byMetric.happiness), user.forms.join(", ")];
    row.getCell(4).numFmt = "0.00";
    row.getCell(5).numFmt = "0.0%";
    [6, 7, 8].forEach((column) => { row.getCell(column).numFmt = "0.00"; });
    row.eachCell((cell) => { cell.font = { name: "Arial", size: 10, color: { argb: COLORS.ink } }; cell.alignment = { vertical: "middle", wrapText: true }; cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } }; });
  });
  summary.views = [{ showGridLines: false, state: "frozen", ySplit: 8 }];
  writeEvolutionSheet(workbook, input.report);
  const used = new Set(["Resumen", "Evolución"]);
  input.report.forms.forEach((form) => writeFormSheet(workbook, form, safeSheetName(form.form.title, used)));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
