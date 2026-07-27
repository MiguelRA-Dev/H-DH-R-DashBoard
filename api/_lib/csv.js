const BOM = "﻿";

function escapeCsvValue(value) {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// `columns`: [{ label: string, value: (row) => any }]. Antepone BOM UTF-8 para
// que Excel detecte la codificación y no rompa los acentos.
export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvValue(c.value(row))).join(","));
  return BOM + [header, ...lines].join("\r\n");
}
