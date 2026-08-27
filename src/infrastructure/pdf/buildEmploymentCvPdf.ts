import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { CvContent } from "@/domain/entities";

function escapeHtml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
async function launchBrowser() { return process.env.VERCEL ? puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true }) : puppeteer.launch({ channel: "chrome", headless: true }); }

function html(content: CvContent): string {
  const contact = [content.contact.fullName, content.contact.location, content.contact.phone, content.contact.email, content.contact.linkedinUrl].filter((value): value is string => Boolean(value)).map(escapeHtml).join(" | ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    @page{size:A4;margin:14mm 16mm}*{box-sizing:border-box}body{margin:0;color:#171717;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;line-height:1.35}h1{font-size:19pt;letter-spacing:.02em;margin:0 0 4px}h2{font-size:10pt;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid #222;margin:15px 0 6px;padding-bottom:2px}.contact{font-size:9pt;color:#444}.summary{margin:0}.item{margin:0 0 9px}.item-title{font-weight:700}.meta{float:right;font-size:9pt;color:#444}.sub{margin:1px 0 3px}.bullets{margin:3px 0 0;padding-left:17px}.bullets li{margin:0 0 3px}.skills{margin:0} @media print{body{print-color-adjust:exact}}
  </style></head><body><h1>${escapeHtml(content.contact.fullName)}</h1><p class="contact">${contact}</p><h2>Perfil</h2><p class="summary">${escapeHtml(content.summary)}</p><h2>Experiencia</h2>${content.experience.map((entry) => `<section class="item"><span class="meta">${escapeHtml(entry.startDate)} - ${escapeHtml(entry.endDate || "Actual")}</span><div class="item-title">${escapeHtml(entry.role)} | ${escapeHtml(entry.organization)}</div><p class="sub">${escapeHtml(entry.location)}</p><ul class="bullets">${entry.bullets.map((bullet) => `<li>${escapeHtml(bullet.text)}</li>`).join("")}</ul></section>`).join("")}<h2>Educación</h2>${content.education.map((entry) => `<section class="item"><span class="meta">${escapeHtml(entry.startDate)} - ${escapeHtml(entry.endDate || "Actual")}</span><div class="item-title">${escapeHtml(entry.degree)}</div><p class="sub">${escapeHtml(entry.institution)}${entry.fieldOfStudy ? ` | ${escapeHtml(entry.fieldOfStudy)}` : ""}</p></section>`).join("")}<h2>Habilidades</h2><p class="skills">${content.skills.map(escapeHtml).join(" | ")}</p></body></html>`;
}

export async function buildEmploymentCvPdf(content: CvContent): Promise<{ pdf: Buffer; pageCount: number }> {
  const browser = await launchBrowser();
  try { const page = await browser.newPage(); await page.setContent(html(content), { waitUntil: "load" }); const pageCount = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight / 1046)); const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true })); return { pdf, pageCount }; } finally { await browser.close(); }
}
