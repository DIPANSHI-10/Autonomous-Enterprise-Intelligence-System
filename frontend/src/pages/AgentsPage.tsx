import { Bot, Check, Wrench } from "lucide-react";
import { useState } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export function AgentsPage() {
  const agents = useAppStore((s) => s.agents);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const addToast = useAppStore((s) => s.addToast);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [instructions, setInstructions] = useState("");

  const startEdit = (id: string, model: string, instr: string) => {
    setEditingId(id);
    setModelName(model);
    setInstructions(instr);
  };

  const saveEdit = async (id: string) => {
    await api.updateAgent(id, { model_name: modelName, system_instructions: instructions });
    setEditingId(null);
    addToast({ title: "Agent Configuration Updated", variant: "success" });
    await refreshAll();
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await api.updateAgent(id, { enabled: !enabled });
    await refreshAll();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Specialized AI Agents</h2>
        <p className="text-xs text-slate-400">
          Configure model selection, tool permissions, and system instructions for each LangGraph agent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((ag) => (
          <GlassCard key={ag.id} className="p-4 space-y-3" hoverGlow>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#36D9F5]/15 border border-[#36D9F5]/40 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#36D9F5]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{ag.name}</h3>
                  <p className="text-xs text-[#5587FF]">{ag.role}</p>
                </div>
              </div>
              <button
                onClick={() => toggleEnabled(ag.id, ag.enabled)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  ag.enabled
                    ? "bg-[#42D6A4]/15 border-[#42D6A4]/40 text-[#42D6A4]"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}
              >
                {ag.enabled ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            <p className="text-xs text-slate-300">{ag.description}</p>

            <div className="flex flex-wrap gap-1.5">
              {ag.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#050914] border border-[#1B2B43] text-slate-300"
                >
                  <Wrench className="w-2.5 h-2.5 text-[#36D9F5]" /> {t}
                </span>
              ))}
            </div>

            {editingId === ag.id ? (
              <div className="space-y-2 pt-2 border-t border-[#1B2B43]">
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-[#050914] border border-[#1B2B43] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full bg-[#050914] border border-[#1B2B43] rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  onClick={() => saveEdit(ag.id)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#42D6A4] text-[#050914] text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-[#1B2B43] text-xs">
                <span className="font-mono text-slate-400">
                  {ag.model_provider} / {ag.model_name}
                </span>
                <button
                  onClick={() => startEdit(ag.id, ag.model_name, ag.system_instructions)}
                  className="text-[#36D9F5] hover:underline"
                >
                  Configure
                </button>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
