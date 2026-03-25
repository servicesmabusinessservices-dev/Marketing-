<<<<<<< Updated upstream
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('""') || str.includes('\n') || str.includes('\r')) {
    return '""' + str.replace(/\""/g, '""""""') + '""';
=======
/**
 * Client-side CSV and Excel export utilities.
 */

/**
 * Escape a value for safe CSV inclusion.
 * Wraps in quotes if the value contains commas, quotes, or newlines.
 */
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
>>>>>>> Stashed changes
  }
  return str;
}

<<<<<<< Updated upstream
=======
/**
 * Trigger a browser file download from a Blob.
 */
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
/**
 * Export data as a CSV file download.
 *
 * @param {Array<object>} rows    Data rows
 * @param {Array<{key: string, label: string}>} columns  Column definitions
 * @param {string} filename       e.g. "contacts.csv"
 */
>>>>>>> Stashed changes
export function exportToCSV(rows, columns, filename = 'export.csv') {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const body = rows.map(row =>
    columns.map(c => csvEscape(row[c.key])).join(',')
  ).join('\n');

<<<<<<< Updated upstream
  const csv = header + '\n' + body;
=======
  const csv = `${header}\n${body}`;
>>>>>>> Stashed changes
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

<<<<<<< Updated upstream
=======
/**
 * Export data as an Excel (.xlsx) file download.
 * Uses the exceljs library for workbook creation.
 *
 * @param {Array<object>} rows    Data rows
 * @param {Array<{key: string, label: string}>} columns  Column definitions
 * @param {string} filename       e.g. "contacts.xlsx"
 */
>>>>>>> Stashed changes
export async function exportToExcel(rows, columns, filename = 'export.xlsx') {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Export');

<<<<<<< Updated upstream
=======
  // Header row
>>>>>>> Stashed changes
  sheet.columns = columns.map(c => ({
    header: c.label,
    key: c.key,
    width: Math.max(c.label.length + 4, 15),
  }));

<<<<<<< Updated upstream
=======
  // Style header
>>>>>>> Stashed changes
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EAED' },
  };

<<<<<<< Updated upstream
  rows.forEach(row => {
    const values = {};
    columns.forEach(c => { values[c.key] = row[c.key] || ''; });
=======
  // Data rows
  rows.forEach(row => {
    const values = {};
    columns.forEach(c => { values[c.key] = row[c.key] ?? ''; });
>>>>>>> Stashed changes
    sheet.addRow(values);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
<<<<<<< Updated upstream
}
=======
}
>>>>>>> Stashed changes
