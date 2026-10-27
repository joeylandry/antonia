/** Escape one CSV cell, and neutralise spreadsheet formula injection (=, +, -, @ at the start of text). */
export function csvCell(value: unknown): string {
  if (value == null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
