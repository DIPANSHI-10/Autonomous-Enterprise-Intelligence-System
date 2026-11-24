import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Server,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CommandInput } from "../components/common/CommandInput";
import { GlassCard } from "../components/common/GlassCard";
import { NeuralGlobe } from "../components/neural/NeuralGlobe";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { AgentDefinition } from "../types";

export function NeuralDashboard() {
  const metrics = useAppStore((s) => s.metrics);
  const agents = useAppStore((s) => s.agents);
  const tasks = useAppStore((s) => s.tasks);
  const activeExecutions = useAppStore((s) => s.activeExecutions);
  const approvals = useAppStore((s) => s.approvals);
  const setActivePage = useAppStore((s) => s.setActivePage);

  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [semanticRefs, setSemanticRefs] = useState<
    Array<{ filename: string; content: string; relevance_score: number }>
  >([]);

  useEffect(() => {
    void api
      .searchDocuments("enterprise intelligence")
      .then((res) => setSemanticRefs(res.results.slice(0, 4)))
      .catch(() => {});
  }, [tasks.length]);

  const activeTask = tasks.find((t) => t.status === "running") || tasks[0];
  const activeAgentId = activeTask?.current_agent || null;
  const healthScore = metrics?.system_health?.score ?? 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT SIDEBAR PANELS */}
        <div className="xl:col-span-3 space-y-4">
          <GlassCard className="p-4" hoverGlow>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#36D9F5]">
                Operational Index
              </h3>
              <Activity className="w-4 h-4 text-[#36D9F5]" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#050914]/60 border border-[#1B2B43]">
                <p className="text-slate-400 text-[11px]">Success Rate</p>
                <p className="text-lg font-bold text-[#42D6A4] font-mono">
                  {metrics?.operational_index.task_success_rate ?? 100}%
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#050914]/60 border border-[#1B2B43]">
                <p className="text-slate-400 text-[11px]">Completed</p>
                <p className="text-lg font-bold text-white font-mono">
                  {metrics?.operational_index.completed_tasks ?? 0}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#050914]/60 border border-[#1B2B43]">
                <p className="text-slate-400 text-[11px]">Failed Tasks</p>
                <p className="text-lg font-bold text-[#FF9A42] font-mono">
                  {metrics?.operational_index.failed_tasks ?? 0}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#050914]/60 border border-[#1B2B43]">
                <p className="text-slate-400 text-[11px]">Avg Exec Time</p>
                <p className="text-lg font-bold text-[#5587FF] font-mono">
                  {Math.round(metrics?.operational_index.avg_execution_time_ms ?? 0)}ms
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4" hoverGlow delay={0.05}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5587FF]">
                Cognitive Load
              </h3>
              <Cpu className="w-4 h-4 text-[#5587FF]" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Agents</span>
                <span className="font-mono text-white">
                  {metrics?.cognitive_load.active_agents ?? 0} / {metrics?.cognitive_load.enabled_agents ?? 7}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Running / Queued Tasks</span>
                <span className="font-mono text-[#36D9F5]">
                  {metrics?.cognitive_load.running_tasks ?? 0} / {metrics?.cognitive_load.queued_tasks ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tool Calls Executed</span>
                <span className="font-mono text-[#A66CFF]">
                  {metrics?.cognitive_load.total_tool_calls ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Workflow Events</span>
                <span className="font-mono text-slate-200">
                  {metrics?.cognitive_load.api_activity_events ?? 0}
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4" hoverGlow delay={0.1}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#42D6A4]">
                System Diagnostics
              </h3>
              <Server className="w-4 h-4 text-[#42D6A4]" />
            </div>
            <div className="space-y-1.5 text-xs">
              {Object.entries(
                metrics?.diagnostics ?? {
                  backend: "connected",
                  database: "connected",
                  llm_providers: "fallback_ready",
                  vector_database: "ready",
                  mcp: "connected",
                  memory_subsystem: "connected",
                }
              ).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-0.5">
                  <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#42D6A4]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#42D6A4]" />
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center justify-between" hoverGlow delay={0.15}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                System Health
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {metrics?.system_health?.indexed_documents ?? 0} docs ·{" "}
                {metrics?.system_health?.memory_records ?? 0} memories
              </p>
              <p className="text-[11px] text-[#42D6A4] capitalize mt-0.5">
                Status: {metrics?.system_health?.status ?? "optimal"}
              </p>
            </div>
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#1B2B43"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#42D6A4"
                  strokeWidth="3"
                  strokeDasharray={`${healthScore}, 100`}
                />
              </svg>
              <span className="absolute text-xs font-bold font-mono text-white">{healthScore}%</span>
            </div>
          </GlassCard>
        </div>

        {/* CENTER 3D NEURAL INTELLIGENCE GLOBE + COMMAND INPUT */}
        <div className="xl:col-span-6 flex flex-col gap-4">
          <GlassCard className="relative h-[430px] overflow-hidden border-[#36D9F5]/25">
            <div className="absolute top-3 left-4 z-10 pointer-events-none">
              <p className="text-[11px] font-mono uppercase tracking-widest text-[#36D9F5]">
                Neural Intelligence Core
              </p>
              <p className="text-xs text-slate-400">
                {activeTask
                  ? `Active Objective: ${activeTask.objective.slice(0, 68)}... (${Math.round(activeTask.progress)}%)`
                  : "System Idle · Submit an enterprise objective below"}
              </p>
            </div>

            <NeuralGlobe
              agents={agents}
              activeAgentId={activeAgentId}
              onSelectAgent={(ag) => setSelectedAgent(ag)}
            />

            {selectedAgent && (
              <div className="absolute bottom-3 left-3 right-3 glass-panel rounded-xl p-3 border-[#36D9F5]/50 z-20 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#36D9F5]">{selectedAgent.name}</p>
                  <p className="text-[11px] text-slate-300">{selectedAgent.description}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">
                    Model: {selectedAgent.model_name} · Tools: {selectedAgent.tools.join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </GlassCard>

          <CommandInput />
        </div>

        {/* RIGHT SIDEBAR PANELS */}
        <div className="xl:col-span-3 space-y-4">
          <GlassCard className="p-4" hoverGlow>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A66CFF]">
                Active Agents
              </h3>
              <Bot className="w-4 h-4 text-[#A66CFF]" />
            </div>
            <div className="space-y-2 max-h-[265px] overflow-y-auto pr-1">
              {agents.map((ag) => {
                const exec = activeExecutions.find((e) => e.agent_id === ag.id);
                const isRunning = activeAgentId === ag.id || exec?.status === "running";
                const statusLabel = isRunning ? "running" : exec?.status || "standby";
                return (
                  <div
                    key={ag.id}
                    onClick={() => setSelectedAgent(ag)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      isRunning
                        ? "bg-[#36D9F5]/10 border-[#36D9F5]/50"
                        : "bg-[#050914]/60 border-[#1B2B43] hover:border-[#36D9F5]/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-100">{ag.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          statusLabel === "running"
                            ? "bg-[#36D9F5]/20 text-[#36D9F5]"
                            : statusLabel === "completed"
                            ? "bg-[#42D6A4]/20 text-[#42D6A4]"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {exec?.current_task || ag.role}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>{ag.model_name}</span>
                      <span>{exec ? `${exec.duration_ms}ms` : "ready"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard className="p-4" hoverGlow delay={0.05}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#FF9A42]">
                Suggested Actions
              </h3>
              <AlertTriangle className="w-4 h-4 text-[#FF9A42]" />
            </div>
            <div className="space-y-2 text-xs">
              {approvals.length > 0 ? (
                <button
                  onClick={() => setActivePage("orchestration-studio")}
                  className="w-full text-left p-2.5 rounded-lg bg-[#FF9A42]/10 border border-[#FF9A42]/40 text-[#FF9A42]"
                >
                  {approvals.length} pending human approval gate(s) awaiting decision.
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-[#050914]/60 border border-[#1B2B43] flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-[#42D6A4] shrink-0" />
                  <span>All verification checks and approval gates are clear.</span>
                </div>
              )}
              <button
                onClick={() => setActivePage("knowledge-base")}
                className="w-full text-left p-2 rounded-lg bg-[#050914]/60 border border-[#1B2B43] text-slate-300 hover:border-[#36D9F5]/40"
              >
                Upload enterprise PDF/DOCX reports to enrich RAG context →
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-4" hoverGlow delay={0.1}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#36D9F5]">
                Semantic References
              </h3>
              <BookOpen className="w-4 h-4 text-[#36D9F5]" />
            </div>
            {semanticRefs.length === 0 ? (
              <p className="text-xs text-slate-400">
                No indexed documents matched yet. Upload files in Knowledge Base.
              </p>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {semanticRefs.map((ref, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#050914]/60 border border-[#1B2B43] text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#36D9F5] font-medium truncate">{ref.filename}</span>
                      <span className="font-mono text-[#42D6A4]">{ref.relevance_score}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{ref.content}</p>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* BOTTOM ANALYTICS (4 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <GlassCard className="p-4 h-48">
          <p className="text-xs font-semibold text-slate-300 mb-2">1. Agent Contact Graph</p>
          <ResponsiveContainer width="100%" height="82%">
            <BarChart data={metrics?.charts.agent_utilization || []}>
              <XAxis dataKey="agent_id" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0C1729", borderColor: "#1B2B43", fontSize: 11 }} />
              <Bar dataKey="executions" fill="#36D9F5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-4 h-48">
          <p className="text-xs font-semibold text-slate-300 mb-2">2. Task Throughput</p>
          <ResponsiveContainer width="100%" height="82%">
            <AreaChart data={metrics?.charts.throughput || []}>
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0C1729", borderColor: "#1B2B43", fontSize: 11 }} />
              <Area type="monotone" dataKey="progress" stroke="#5587FF" fill="#5587FF" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-4 h-48 flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-300">3. Retrieval Quality (RAG)</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Indexed Documents</span>
              <span className="font-mono text-[#36D9F5]">{metrics?.system_health?.indexed_documents ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hybrid Retrieval Mode</span>
              <span className="font-mono text-[#42D6A4]">Cosine + BM25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Persistent Memories</span>
              <span className="font-mono text-[#A66CFF]">{metrics?.system_health?.memory_records ?? 0}</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-[#36D9F5]" /> Grounded citation pipeline active
          </div>
        </GlassCard>

        <GlassCard className="p-4 h-48">
          <p className="text-xs font-semibold text-slate-300 mb-2">4. System Performance (Latency ms)</p>
          <ResponsiveContainer width="100%" height="82%">
            <BarChart data={metrics?.charts.agent_utilization || []}>
              <XAxis dataKey="agent_id" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0C1729", borderColor: "#1B2B43", fontSize: 11 }} />
              <Bar dataKey="avg_duration_ms" fill="#A66CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
