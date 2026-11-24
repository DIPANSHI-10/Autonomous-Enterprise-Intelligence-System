import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import type { WorkflowEventItem } from "../types";

export function ExecutionLogsPage() {
  const [logs, setLogs] = useState<WorkflowEventItem[]>([]);

  const load = async () => setLogs(await api.listLogs(120));

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Execution Logs</h2>
          <p className="text-xs text-slate-400">Auditable LangGraph agent transitions, latencies, and event payloads</p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C1729] border border-[#1B2B43] text-xs text-slate-200 hover:border-[#36D9F5]/50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#091326] border-b border-[#1B2B43] text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Task ID</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B2B43]/60">
              {logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-[#091326]/50">
                  <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[#36D9F5]">
                    {log.task_id ? log.task_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-200">{log.source_agent || "system"}</td>
                  <td className="px-4 py-2.5 text-slate-300 max-w-md truncate">{log.message}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                        log.status === "completed"
                          ? "bg-[#42D6A4]/20 text-[#42D6A4]"
                          : log.status === "failed"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-[#36D9F5]/20 text-[#36D9F5]"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-400">{log.duration_ms ?? 0}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
