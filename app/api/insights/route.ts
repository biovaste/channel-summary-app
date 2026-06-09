import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CleanedData } from "@/lib/cleanData";

export const runtime = "nodejs";

const CMO_PROMPT = `You are a senior marketing analyst preparing a briefing for a CMO.

You will receive cleaned marketing data. Your job is to produce exactly 2–3 key insights that:
- Are strategic, not just descriptive (don't just repeat the numbers)
- Connect data points to business impact (revenue, growth, efficiency, risk)
- Are written for a C-level audience: confident, direct, no jargon
- Each insight is 2–4 sentences with a clear headline

Format your response as Markdown with this structure:

## Insight 1: [Short headline]
[Body — 2–4 sentences]

## Insight 2: [Short headline]
[Body — 2–4 sentences]

## Insight 3: [Short headline] *(only if clearly supported by the data)*
[Body — 2–4 sentences]

---
**Recommended action:** [One sentence on the single most important action to take based on these insights]

Do not include preamble, do not summarize the data before the insights. Start directly with ## Insight 1.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let body: { cleaned: CleanedData };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { cleaned } = body;
  if (!cleaned) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  const dataDescription = buildDataDescription(cleaned);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent([
      CMO_PROMPT,
      "\n\nHere is the marketing data:\n\n" + dataDescription,
    ]);
    const text = result.response.text();
    return NextResponse.json({ insights: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gemini API error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildDataDescription(cleaned: CleanedData): string {
  const lines: string[] = [];

  lines.push(`Columns: ${cleaned.columns.join(", ")}`);
  lines.push(`Rows: ${cleaned.rowCount}`);

  if (cleaned.dateRange) {
    lines.push(`Date range: ${cleaned.dateRange.from} to ${cleaned.dateRange.to}`);
  }

  if (cleaned.numericSummary && Object.keys(cleaned.numericSummary).length > 0) {
    lines.push("\nNumeric column summaries:");
    for (const [col, stats] of Object.entries(cleaned.numericSummary)) {
      lines.push(
        `  ${col}: min=${stats.min}, max=${stats.max}, sum=${stats.sum}, avg=${stats.avg.toFixed(2)}, nulls=${stats.nullCount}`
      );
    }
  }

  lines.push("\nSample rows (up to 20):");
  lines.push(cleaned.columns.join("\t"));
  for (const row of cleaned.sampleRows.slice(0, 20)) {
    lines.push(cleaned.columns.map((c) => row[c] ?? "").join("\t"));
  }

  if (cleaned.rawTextFallback) {
    lines.push("\nRaw data (could not be parsed as CSV):\n" + cleaned.rawTextFallback.slice(0, 2000));
  }

  return lines.join("\n");
}
