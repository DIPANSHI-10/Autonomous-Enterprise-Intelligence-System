import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const addToast = useAppStore((s) => s.addToast);
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [retries, setRetries] = useState(2);
  const [requireApproval, setRequireApproval] = useState(false);

  useEffect(() => {
    void api.getSettings().then((s) => {
      setProvider(s.default_llm_provider);
      setModel(s.default_llm_model);
      setRetries(s.max_workflow_retries);
      setRequireApproval(s.require_approval_for_reports);
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await api.updateSettings({
      default_llm_provider: provider,
      default_llm_model: model,
      max_workflow_retries: retries,
      require_approval_for_reports: requireApproval,
    });
    addToast({ title: "Settings Saved", description: "Runtime configuration updated.", variant: "success" });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-white">Platform Settings</h2>
        <p className="text-xs text-slate-400">
          Configure default LLM providers, LangGraph execution limits, and security policies
        </p>
      </div>

      <GlassCard className="p-5">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">Default LLM Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-white"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Default Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Max LangGraph Verification Retries</label>
            <input
              type="number"
              min={0}
              max={5}
              value={retries}
              onChange={(e) => setRetries(Number(e.target.value))}
              className="w-full bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="rounded border-[#1B2B43]"
            />
            <span>Require Human-in-the-Loop approval before publishing reports</span>
          </label>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#36D9F5] text-[#050914] font-semibold"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
