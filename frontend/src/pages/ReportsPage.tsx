import { Download, ExternalLink, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import type { ReportItem } from "../types";

export function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selected, setSelected] = useState<ReportItem | null>(null);

  useEffect(() => {
    void api.listReports().then((data) => {
      setReports(data);
      if (data.length > 0) setSelected(data[0]);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Intelligence Reports</h2>
        <p className="text-xs text-slate-400">
          Verified executive reports, source citations, and downloadable PDF exports
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <GlassCard className="xl:col-span-4 p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400">No reports generated yet. Submit a research objective first.</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selected?.id === r.id
                    ? "bg-[#36D9F5]/10 border-[#36D9F5]/50"
                    : "bg-[#050914]/60 border-[#1B2B43] hover:border-[#36D9F5]/30"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <FileText className="w-4 h-4 text-[#36D9F5] shrink-0" />
                  <span className="truncate">{r.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{r.executive_summary}</p>
              </div>
            ))
          )}
        </GlassCard>

        <GlassCard className="xl:col-span-8 p-5 space-y-4 max-h-[600px] overflow-y-auto">
          {!selected ? (
            <p className="text-xs text-slate-400 py-16 text-center">Select a report to preview.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1B2B43]">
                <div>
                  <h3 className="text-base font-semibold text-white">{selected.title}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Task {selected.task_id}</p>
                </div>
                {selected.has_pdf && (
                  <a
                    href={api.getReportPdfUrl(selected.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#36D9F5] text-[#050914] font-semibold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#050914]/70 border border-[#1B2B43] text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selected.content_markdown}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#42D6A4] mb-2">
                  Source Citations ({selected.citations.length})
                </h4>
                <div className="space-y-1.5">
                  {selected.citations.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#050914]/60 border border-[#1B2B43] text-xs"
                    >
                      <span className="text-slate-200 truncate">{c.title}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#36D9F5]">
                        {c.type} <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
