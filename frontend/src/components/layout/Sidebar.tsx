import {
  Activity,
  Bot,
  Brain,
  Cpu,
  Database,
  FileText,
  FolderKanban,
  GitBranch,
  Globe,
  Plug,
  SearchCode,
  Settings,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";
import type { PageId } from "../../types";

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: typeof Globe }> = [
  { id: "neural-dashboard", label: "Neural Dashboard", icon: Globe },
  { id: "orchestration-studio", label: "Orchestration Studio", icon: GitBranch },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "research-workspace", label: "Research Workspace", icon: SearchCode },
  { id: "knowledge-base", label: "Knowledge Base", icon: Database },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "execution-logs", label: "Execution Logs", icon: Activity },
  { id: "analytics", label: "Analytics", icon: Cpu },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const activePage = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);

  return (
    <aside className="w-64 shrink-0 border-r border-[#1B2B43] bg-[#091326]/95 backdrop-blur-xl flex flex-col">
      <div className="px-4 py-4 border-b border-[#1B2B43] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#36D9F5] to-[#5587FF] flex items-center justify-center shadow-[0_0_20px_rgba(54,217,245,0.35)]">
          <Brain className="w-5 h-5 text-[#050914]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-[#36D9F5] uppercase">AEIS Platform</p>
          <p className="text-[11px] text-slate-300 truncate font-medium">
            Autonomous Enterprise Intelligence System
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                isActive
                  ? "bg-gradient-to-r from-[#36D9F5]/20 to-[#5587FF]/10 text-[#36D9F5] border border-[#36D9F5]/40 shadow-[0_0_16px_rgba(54,217,245,0.12)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#0C1729]"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#36D9F5]" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1B2B43] text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>LangGraph + MCP + A2A</span>
          <span className="text-[#42D6A4] font-mono">v1.0</span>
        </div>
      </div>
    </aside>
  );
}
