"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { InsightCard } from "@/components/InsightCard";
import { cleanData, type CleanedData } from "@/lib/cleanData";

type Status = "idle" | "cleaning" | "generating" | "done" | "error";

export default function Home() {
  const [pasteText, setPasteText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<string>("");
  const [cleanedSummary, setCleanedSummary] = useState<CleanedData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleGenerate(rawText: string) {
    setStatus("cleaning");
    setError("");

    let parsed: Record<string, string>[] = [];
    try {
      const result = Papa.parse<Record<string, string>>(rawText.trim(), {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });
      parsed = result.data;
    } catch {
      // fall through — cleanData handles raw text too
    }

    const cleaned = cleanData(rawText, parsed);
    setCleanedSummary(cleaned);

    setStatus("generating");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaned }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || "API error");
      }
      const { insights: text } = await res.json();
      setInsights(text);
      setStatus("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("error");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPasteText(text);
      handleGenerate(text);
    };
    reader.readAsText(file);
  }

  const busy = status === "cleaning" || status === "generating";

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Marketing Insights Generator
        </h1>
        <p className="mt-2 text-gray-500 text-sm">
          Paste or upload marketing data in any format. Get 2–3 CMO-level insights in seconds.
        </p>
      </header>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paste data (CSV, JSON, raw numbers — any format)
          </label>
          <textarea
            className="w-full h-48 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={"date,sessions,conversions,revenue\n2024-01-01,1200,34,2100\n2024-01-02,980,21,1450\n..."}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => pasteText.trim() && handleGenerate(pasteText)}
            disabled={busy || !pasteText.trim()}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {status === "cleaning" ? "Cleaning data…" : status === "generating" ? "Generating insights…" : "Generate Insights"}
          </button>

          <span className="text-gray-400 text-sm">or</span>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
        </div>

        {cleanedSummary && status !== "idle" && (
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Cleaned: {cleanedSummary.rowCount} rows, {cleanedSummary.columns.length} columns
            {cleanedSummary.warnings.length > 0 && (
              <span className="ml-2 text-amber-500">{cleanedSummary.warnings.join(" · ")}</span>
            )}
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
      </section>

      {status === "done" && insights && (
        <InsightCard markdown={insights} />
      )}
    </main>
  );
}
