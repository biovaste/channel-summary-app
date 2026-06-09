"use client";

import { useRef } from "react";

interface Props {
  markdown: string;
}

export function InsightCard({ markdown }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleCopy() {
    navigator.clipboard.writeText(markdown);
  }

  async function handlePDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height * pdfW) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save("marketing-insights.pdf");
  }

  const rendered = renderMarkdown(markdown);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Insights</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Copy text
          </button>
          <button
            onClick={handlePDF}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div
        ref={cardRef}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    // h2
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-gray-900 mb-2 mt-6 first:mt-0">$1</h2>')
    // h3
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-800 mb-1 mt-4">$1</h3>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // hr
    .replace(/^---$/gm, '<hr class="border-gray-100 my-4" />')
    // paragraphs (lines with content)
    .replace(/^(?!<[h|s|h]|$)(.+)$/gm, '<p class="text-gray-700 leading-relaxed text-sm">$1</p>')
    // blank lines between blocks
    .replace(/\n{2,}/g, "\n");
}
