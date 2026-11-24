import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "../components/common/GlassCard";
import { useAppStore } from "../store/useAppStore";

export function AnalyticsPage() {
  const metrics = useAppStore((s) => s.metrics);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Enterprise Analytics</h2>
        <p className="text-xs text-slate-400">
          Real database-derived task success, agent utilization, token consumption, and latency metrics
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400">Total Tasks</p>
          <p className="text-2xl font-bold text-white font-mono mt-1">
            {metrics?.operational_index.total_tasks ?? 0}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400">Success Rate</p>
          <p className="text-2xl font-bold text-[#42D6A4] font-mono mt-1">
            {metrics?.operational_index.task_success_rate ?? 100}%
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400">Total Tokens</p>
          <p className="text-2xl font-bold text-[#36D9F5] font-mono mt-1">
            {metrics?.system_health.total_tokens ?? 0}
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-xs text-slate-400">MCP / Tool Calls</p>
          <p className="text-2xl font-bold text-[#A66CFF] font-mono mt-1">
            {metrics?.cognitive_load.total_tool_calls ?? 0}
          </p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-4 h-72">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">Agent Executions & Latency (ms)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={metrics?.charts.agent_utilization || []}>
              <XAxis dataKey="agent_id" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0C1729", borderColor: "#1B2B43", fontSize: 12 }} />
              <Bar dataKey="avg_duration_ms" fill="#36D9F5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="p-4 h-72">
          <h3 className="text-xs font-semibold text-slate-300 mb-3">Token Consumption by Agent</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={metrics?.charts.agent_utilization || []}>
              <XAxis dataKey="agent_id" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0C1729", borderColor: "#1B2B43", fontSize: 12 }} />
              <Bar dataKey="tokens_used" fill="#A66CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
