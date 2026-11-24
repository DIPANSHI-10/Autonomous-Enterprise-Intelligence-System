import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BarChart3, Bot, Compass, FileText, MoreHorizontal, Search, Wrench } from "lucide-react";
import { useState } from "react";

export interface AgentNodeData extends Record<string, unknown> {
  agentId: string;
  label: string;
  category: "research" | "analysis" | "writing" | "decision" | "supervisor";
  status: string;
  currentTask: string;
  progress: number;
  tools: string[];
  summary: string;
  description: string;
  logs: string[];
}

const THEME_MAP = {
  research: {
    border: "border-[#42D6A4]/60",
    glow: "shadow-[0_0_24px_rgba(66,214,164,0.2)]",
    badge: "bg-[#42D6A4]/20 text-[#42D6A4]",
    bar: "from-[#42D6A4] to-[#36D9F5]",
    icon: Search,
  },
  analysis: {
    border: "border-amber-400/60",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.2)]",
    badge: "bg-amber-400/20 text-amber-300",
    bar: "from-amber-400 to-yellow-300",
    icon: BarChart3,
  },
  writing: {
    border: "border-[#5587FF]/60",
    glow: "shadow-[0_0_24px_rgba(85,135,255,0.22)]",
    badge: "bg-[#5587FF]/20 text-[#5587FF]",
    bar: "from-[#5587FF] to-[#36D9F5]",
    icon: FileText,
  },
  decision: {
    border: "border-[#FF9A42]/60",
    glow: "shadow-[0_0_24px_rgba(255,154,66,0.22)]",
    badge: "bg-[#FF9A42]/20 text-[#FF9A42]",
    bar: "from-[#FF9A42] to-amber-500",
    icon: Compass,
  },
  supervisor: {
    border: "border-[#A66CFF]/60",
    glow: "shadow-[0_0_24px_rgba(166,108,255,0.22)]",
    badge: "bg-[#A66CFF]/20 text-[#A66CFF]",
    bar: "from-[#A66CFF] to-[#5587FF]",
    icon: Bot,
  },
};

export function AgentNode({ data }: NodeProps) {
  const d = data as AgentNodeData;
  const [hovered, setHovered] = useState(false);
  const theme = THEME_MAP[d.category] || THEME_MAP.research;
  const Icon = theme.icon;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative w-72 rounded-2xl bg-[#0C1729]/95 backdrop-blur-xl border ${theme.border} ${
        d.status === "running" ? theme.glow : ""
      } p-4 transition-all duration-200 hover:scale-[1.02]`}
    >
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[#36D9F5] !border-0" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[#36D9F5] !border-0" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme.badge}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white leading-tight">{d.label}</h4>
            <span className={`inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded ${theme.badge}`}>
              {d.status.toUpperCase()}
            </span>
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-slate-400" />
      </div>

      <p className="mt-3 text-xs text-slate-300 line-clamp-2 min-h-[32px]">{d.currentTask}</p>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(d.progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#050914] overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${theme.bar} transition-all duration-500`}
            style={{ width: `${Math.min(100, Math.max(0, d.progress))}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 truncate">
          <Wrench className="w-3 h-3 text-[#36D9F5]" />
          {d.tools.slice(0, 2).join(", ")}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400 truncate">{d.summary}</p>

      {/* Hover Floating Information Panel */}
      {hovered && (
        <div className="absolute left-0 right-0 -bottom-2 translate-y-full z-50 glass-panel rounded-xl p-3 border-[#36D9F5]/50 shadow-2xl pointer-events-none">
          <p className="text-[11px] font-semibold text-[#36D9F5]">Live Agent Telemetry</p>
          <p className="text-[11px] text-slate-300 mt-1">{d.description}</p>
          <p className="text-[10px] font-mono text-slate-400 mt-1.5">
            Tools: {d.tools.join(" · ")}
          </p>
          {d.logs.length > 0 && (
            <p className="text-[10px] font-mono text-[#42D6A4] mt-1 truncate">
              Last log: {d.logs[d.logs.length - 1]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
