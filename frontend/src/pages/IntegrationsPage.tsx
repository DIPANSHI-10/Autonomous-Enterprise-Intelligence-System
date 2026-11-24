import { Play, Plug, Server, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<
    Array<{ id: string; name: string; category: string; status: string; endpoint?: string }>
  >([]);
  const [mcpServers, setMcpServers] = useState<
    Array<{
      id: string;
      name: string;
      status: string;
      permissions: string[];
      tools: Array<{ name: string; description: string }>;
    }>
  >([]);
  const [a2aAgents, setA2AAgents] = useState<
    Array<{ agent_id: string; name: string; role: string; capabilities: string[] }>
  >([]);
  const [mcpOutput, setMcpOutput] = useState<string>("");

  useEffect(() => {
    void api.listIntegrations().then((res) => setIntegrations(res.integrations));
    void api.listMcpServers().then(setMcpServers);
    void api.listA2AAgents().then(setA2AAgents);
  }, []);

  const testMcpStats = async () => {
    const res = await api.invokeMcpTool({
      server_id: "mcp-analytics",
      tool_name: "compute_statistics",
      arguments: { values: [82, 88, 91, 95, 89], label: "enterprise_benchmark" },
    });
    setMcpOutput(JSON.stringify(res, null, 2));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Integrations, MCP & A2A Gateway</h2>
        <p className="text-xs text-slate-400">
          Manage LLM providers, Model Context Protocol (MCP) servers, and Agent2Agent (A2A) discovery
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <GlassCard key={i.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Plug className="w-4 h-4 text-[#36D9F5]" />
                <h3 className="text-sm font-semibold text-white">{i.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{i.endpoint}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#42D6A4]/20 text-[#42D6A4]">
              {i.status}
            </span>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#36D9F5] flex items-center gap-2">
            <Server className="w-4 h-4" /> MCP Servers & Safe Tool Registry
          </h3>
          <button
            onClick={testMcpStats}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#36D9F5] text-[#050914] text-xs font-semibold"
          >
            <Play className="w-3.5 h-3.5" /> Test MCP Analytics Tool
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mcpServers.map((s) => (
            <div key={s.id} className="p-3 rounded-xl bg-[#050914]/70 border border-[#1B2B43] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-white">{s.name}</span>
                <span className="text-[#42D6A4] font-mono text-[10px]">{s.status}</span>
              </div>
              <p className="text-[11px] text-slate-400">Permissions: {s.permissions.join(", ")}</p>
              <div className="space-y-1">
                {s.tools.map((t) => (
                  <div key={t.name} className="text-[11px] text-[#36D9F5] font-mono">
                    • {t.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {mcpOutput && (
          <pre className="p-3 rounded-lg bg-[#050914] border border-[#1B2B43] text-[11px] font-mono text-[#42D6A4] overflow-x-auto">
            {mcpOutput}
          </pre>
        )}
      </GlassCard>

      <GlassCard className="p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A66CFF] flex items-center gap-2">
          <Share2 className="w-4 h-4" /> A2A Discoverable Agent Cards ({a2aAgents.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {a2aAgents.map((a) => (
            <div key={a.agent_id} className="p-3 rounded-xl bg-[#050914]/70 border border-[#1B2B43] text-xs">
              <p className="font-semibold text-white">{a.name}</p>
              <p className="text-slate-400 text-[11px]">{a.role}</p>
              <p className="text-[10px] font-mono text-[#A66CFF] mt-1">{a.capabilities.join(" · ")}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
