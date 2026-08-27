import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { CvContent } from "@/domain/entities";

const sectionHeading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 90 } });
const text = (value: string) => new TextRun({ text: value });

export async function buildEmploymentCvDocx(content: CvContent): Promise<Buffer> {
  const contact = [content.contact.location, content.contact.phone, content.contact.email, content.contact.linkedinUrl].filter(Boolean).join(" | ");
  const children: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: content.contact.fullName, bold: true, size: 30 })], alignment: AlignmentType.CENTER, spacing: { after: 50 } }),
    new Paragraph({ children: [text(contact)], alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
    sectionHeading("Perfil"), new Paragraph({ children: [text(content.summary)] }), sectionHeading("Experiencia"),
  ];
  for (const entry of content.experience) {
    children.push(new Paragraph({ children: [new TextRun({ text: `${entry.role} | ${entry.organization}`, bold: true }), text(`    ${entry.startDate} - ${entry.endDate || "Actual"}`)] }));
    if (entry.location) children.push(new Paragraph({ children: [text(entry.location)], spacing: { after: 40 } }));
    for (const bullet of entry.bullets) children.push(new Paragraph({ children: [text(bullet.text)], bullet: { level: 0 }, spacing: { after: 40 } }));
  }
  children.push(sectionHeading("Educación"));
  for (const entry of content.education) children.push(new Paragraph({ children: [new TextRun({ text: entry.degree, bold: true }), text(` | ${entry.institution}${entry.fieldOfStudy ? ` | ${entry.fieldOfStudy}` : ""}    ${entry.startDate} - ${entry.endDate || "Actual"}`)] }));
  children.push(sectionHeading("Habilidades"), new Paragraph({ children: [text(content.skills.join(" | "))] }));
  const document = new Document({ sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
  return Buffer.from(await Packer.toBuffer(document));
}
