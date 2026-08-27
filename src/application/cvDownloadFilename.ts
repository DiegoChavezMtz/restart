export function cvDownloadFilename(fullName: string, extension: "pdf" | "docx"): string {
  const pascalName = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("");
  return `CV-${pascalName || "Usuario"}.${extension}`;
}
