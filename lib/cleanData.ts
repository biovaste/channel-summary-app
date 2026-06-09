export interface NumericStats {
  min: number;
  max: number;
  sum: number;
  avg: number;
  nullCount: number;
}

export interface CleanedData {
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  numericSummary: Record<string, NumericStats>;
  dateRange: { from: string; to: string } | null;
  warnings: string[];
  rawTextFallback?: string;
}

const DATE_LIKE = /^(date|day|week|month|period|time|dt|timestamp)/i;
const NUMERIC_LIKE = /^[\d,.\s€$%+-]+$/;

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[\s\-\/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseNumber(v: string): number | null {
  const cleaned = v.replace(/[,\s€$£%]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function looksLikeDate(v: string): boolean {
  return /^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(v) || /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(v);
}

export function cleanData(rawText: string, parsed: Record<string, string>[]): CleanedData {
  const warnings: string[] = [];

  // If parsing failed or produced < 2 rows, fall back to raw text mode
  if (!parsed || parsed.length < 2) {
    return {
      columns: [],
      rowCount: 0,
      sampleRows: [],
      numericSummary: {},
      dateRange: null,
      warnings: ["Could not parse as structured data — sending raw text to AI"],
      rawTextFallback: rawText,
    };
  }

  // Normalize column names
  const originalCols = Object.keys(parsed[0]);
  const colMap: Record<string, string> = {};
  const normalizedCols: string[] = [];
  const seen = new Set<string>();

  for (const orig of originalCols) {
    let norm = normalizeHeader(orig) || `col_${normalizedCols.length}`;
    // deduplicate
    let candidate = norm;
    let i = 2;
    while (seen.has(candidate)) candidate = `${norm}_${i++}`;
    seen.add(candidate);
    colMap[orig] = candidate;
    normalizedCols.push(candidate);
  }

  if (originalCols.some((c, i) => c !== normalizedCols[i])) {
    warnings.push("Column names normalized");
  }

  // Remap rows
  const rows: Record<string, string>[] = parsed.map((row) => {
    const mapped: Record<string, string> = {};
    for (const orig of originalCols) {
      mapped[colMap[orig]] = (row[orig] ?? "").toString().trim();
    }
    return mapped;
  });

  const totalRows = rows.length;
  const nullRows = rows.filter((r) => Object.values(r).every((v) => !v)).length;
  if (nullRows > 0) {
    warnings.push(`${nullRows} empty rows removed`);
  }
  const cleanRows = rows.filter((r) => !Object.values(r).every((v) => !v));

  // Detect numeric columns
  const numericSummary: Record<string, NumericStats> = {};
  for (const col of normalizedCols) {
    const values = cleanRows.map((r) => r[col]);
    const nonEmpty = values.filter((v) => v !== "");
    if (nonEmpty.length === 0) continue;
    const numeric = nonEmpty.filter((v) => NUMERIC_LIKE.test(v));
    if (numeric.length / nonEmpty.length >= 0.7) {
      const nums = nonEmpty.map(parseNumber).filter((n): n is number => n !== null);
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0);
        numericSummary[col] = {
          min: Math.min(...nums),
          max: Math.max(...nums),
          sum,
          avg: sum / nums.length,
          nullCount: nonEmpty.length - nums.length,
        };
      }
    }
  }

  // Detect date range
  let dateRange: { from: string; to: string } | null = null;
  const dateCol = normalizedCols.find((c) => DATE_LIKE.test(c));
  if (dateCol) {
    const dates = cleanRows
      .map((r) => r[dateCol])
      .filter((v) => v && looksLikeDate(v))
      .sort();
    if (dates.length >= 2) {
      dateRange = { from: dates[0], to: dates[dates.length - 1] };
    }
  }

  if (totalRows !== cleanRows.length) {
    warnings.push(`${totalRows - cleanRows.length} rows dropped`);
  }

  return {
    columns: normalizedCols,
    rowCount: cleanRows.length,
    sampleRows: cleanRows.slice(0, 50),
    numericSummary,
    dateRange,
    warnings,
  };
}
