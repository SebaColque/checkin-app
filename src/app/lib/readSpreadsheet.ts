// Lee .xlsx con exceljs y .csv con PapaParse, devolviendo un array de objetos
// donde las claves son los encabezados de la 1ª fila.

export type ParsedTable = { rows: Record<string, any>[]; headers: string[] };

export async function parseFile(file: File): Promise<ParsedTable> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  const ab = await file.arrayBuffer();

  if (ext === 'csv') {
    const Papa = (await import('papaparse')).default;
    const text = new TextDecoder().decode(ab);
    const res = Papa.parse<string[]>(text, { header: false, skipEmptyLines: true });
    if (res.errors.length) throw new Error('CSV inválido');
    return rowsToObjects(res.data);
  }

  // XLSX
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(ab);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No se encontró la primera hoja');

  // Limitar filas/columnas para evitar abusos
  const MAX_ROWS = 5000;
  const MAX_COLS = 50;

  const matrix: string[][] = [];
  const rowCount = Math.min(ws.rowCount || 0, MAX_ROWS);
  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r);
    const arr: string[] = [];
    const colCount = Math.min(ws.columnCount || 0, MAX_COLS);
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      const v = (cell?.text ?? cell?.value ?? '').toString().trim();
      arr.push(v);
    }
    // descartar filas completamente vacías
    if (arr.some(x => x && x.length)) matrix.push(arr);
  }
  return rowsToObjects(matrix);
}

function rowsToObjects(rows: string[][]): ParsedTable {
  if (!rows.length) return { rows: [], headers: [] };
  const headers = rows[0].map((h) => sanitizeHeader(h));
  const out: Record<string, any>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, any> = {};
    rows[i].forEach((val, idx) => obj[headers[idx] || `col_${idx+1}`] = (val ?? '').toString().trim());
    // descartar filas sin contenido real
    if (Object.values(obj).some(v => (v as string).length)) out.push(obj);
  }
  return { rows: out, headers };
}

function sanitizeHeader(h: string) {
  const s = (h || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return s.replace(/[^a-z0-9_ -]/g, '').replace(/\s+/g, ' ').trim();
}
