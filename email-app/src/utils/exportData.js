/**
 * Client-side CSV and Excel export utilities.
 */

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data as a CSV file download.
 *
 * @param {Array<object>} rows    Data rows
 * @param {Array<{key: string, label: string}>} columns  Column definitions
 * @param {string} filename       e.g. "contacts.csv"
 */
export function exportToCSV(rows, columns, filename = 'export.csv') {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows.map(row =>
    columns.map(c => csvEscape(row[c.key])).join(',')
  ).join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Export data as an Excel (.xlsx) file download.
 * Uses the exceljs library for workbook creation.
 *
 * @param {Array<object>} rows    Data rows
 * @param {Array<{key: string, label: string}>} columns  Column definitions
 * @param {string} filename       e.g. "contacts.xlsx"
 */
export async function exportToExcel(rows, columns, filename = 'export.xlsx') {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Export');

  sheet.columns = columns.map(c => ({
    header: c.label,
    key: c.key,
    width: Math.max(c.label.length + 4, 15),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EAED' },
  };

  rows.forEach(row => {
    const values = {};
    columns.forEach(c => { values[c.key] = row[c.key] ?? ''; });
    sheet.addRow(values);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}
