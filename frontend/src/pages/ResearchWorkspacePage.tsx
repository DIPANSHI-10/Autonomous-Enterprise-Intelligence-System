import { AlertTriangle, CheckCircle2, Clock, Download, SearchCode } from "lucide-react";
import { CommandInput } from "../components/common/CommandInput";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export function ResearchWorkspacePage() {
  const tasks = useAppStore((s) => s.tasks);
  const activeTaskId = useAppStore((s) => s.activeTaskId);
  const setActiveTaskId = useAppStore((s) => s.setActiveTaskId);
  const activeExecutions = useAppStore((s) => s.activeExecutions);
  const activeReport = useAppStore((s) => s.activeReport);

  const selected = tasks.find((t) => t.id === activeTaskId) || tasks[0];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Research Workspace</h2>
        <p className="text-xs text-slate-400">
          Launch multi-step research objectives, inspect Supervisor plans, and monitor verification results
        </p>
      </div>

      <CommandInput />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <GlassCard className="xl:col-span-5 p-4 space-y-2 max-h-[460px] overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#36D9F5] mb-2">
            Research Tasks
          </h3>
          {tasks.length === 0 ? (
            <p className="text-xs text-slate-400">No tasks submitted yet.</p>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTaskId(t.id)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selected?.id === t.id
                    ? "bg-[#36D9F5]/10 border-[#36D9F5]/50"
                    : "bg-[#050914]/60 border-[#1B2B43] hover:border-[#36D9F5]/30"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#36D9F5]">{t.status.toUpperCase()}</span>
                  <span className="text-slate-400">{Math.round(t.progress)}%</span>
                </div>
                <p className="text-xs text-slate-200 mt-1 line-clamp-2">{t.objective}</p>
              </div>
            ))
          )}
        </GlassCard>

        <GlassCard className="xl:col-span-7 p-4 space-y-4">
          {!selected ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <SearchCode className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Select a research task to view execution plan and findings.
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white">Objective</h3>
                <p className="text-xs text-slate-300 mt-1">{selected.objective}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#A66CFF] mb-2">
                  Supervisor Execution Plan
                </h4>
                <div className="space-y-1.5">
                  {(selected.plan || []).map((step) => {
                    const exec = activeExecutions.find((e) => e.agent_id === step.agent);
                    return (
                      <div
                        key={step.step}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#050914]/70 border border-[#1B2B43] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {exec?.status === "completed" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#42D6A4]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="font-mono text-[#36D9F5]">{step.agent}</span>
                          <span className="text-slate-300">{step.goal}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {exec ? `${exec.duration_ms}ms` : "pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selected.result_summary && (
                <div className="p-3 rounded-xl bg-[#42D6A4]/10 border border-[#42D6A4]/30 text-xs text-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#42D6A4]">Result Summary</p>
                    {selected.status === "completed" &&
                      activeReport?.task_id === selected.id &&
                      activeReport.has_pdf && (
                        <a
                          href={api.getReportPdfUrl(activeReport.id)}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#36D9F5] text-[#050914] font-semibold text-[11px] hover:opacity-90"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </a>
                      )}
                  </div>
                  <p>{selected.result_summary}</p>
                </div>
              )}

              {selected.error_message && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-rose-300">Execution / Report Notice</p>
                    <p>{selected.error_message}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
