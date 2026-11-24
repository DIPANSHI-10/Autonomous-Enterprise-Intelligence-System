import { Paperclip, Send, Sparkles } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";

const EXAMPLE_PROMPTS = [
  "Research the top 10 AI companies, compare their products, pricing, technologies, customer feedback and market positioning. Identify competitive gaps and generate a detailed strategic report.",
  "Analyze enterprise RAG and multi-agent orchestration frameworks, benchmark latency and accuracy tradeoffs, and recommend an architecture.",
  "Investigate global AI governance and compliance standards (EU AI Act, NIST AI RMF) and produce an executive readiness checklist.",
];

export function CommandInput() {
  const submitTask = useAppStore((s) => s.submitTask);
  const addToast = useAppStore((s) => s.addToast);
  const [objective, setObjective] = useState("");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("high");
  const [mode, setMode] = useState<"autonomous" | "supervised">("autonomous");
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>([]);
  const [attachedNames, setAttachedNames] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileAttach = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.uploadDocument(file, "command-attachments");
      setAttachedDocIds((prev) => [...prev, res.id]);
      setAttachedNames((prev) => [...prev, res.filename]);
      addToast({ title: "Document Attached", description: `${res.filename} indexed for RAG.`, variant: "success" });
    } catch (err) {
      addToast({ title: "Upload Failed", description: String(err), variant: "error" });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!objective.trim() || submitting) return;
    setSubmitting(true);
    try {
      await submitTask({
        objective: objective.trim(),
        research_depth: depth,
        priority,
        execution_mode: mode,
        attached_document_ids: attachedDocIds,
      });
      setObjective("");
      setAttachedDocIds([]);
      setAttachedNames([]);
    } catch (err) {
      addToast({ title: "Submission Failed", description: String(err), variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-3 border-[#36D9F5]/30">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className="text-[11px] text-[#36D9F5] flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3" /> Examples:
        </span>
        {EXAMPLE_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setObjective(p)}
            className="text-[11px] px-2 py-0.5 rounded-full bg-[#091326] border border-[#1B2B43] text-slate-300 hover:border-[#36D9F5]/50 hover:text-white truncate max-w-[220px]"
          >
            {p.slice(0, 42)}...
          </button>
        ))}
      </div>

      <textarea
        rows={2}
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        placeholder="Ask the system to research, analyze, investigate or generate intelligence..."
        className="w-full bg-[#050914]/70 border border-[#1B2B43] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#36D9F5] resize-none"
      />

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#091326] border border-[#1B2B43] text-slate-300 hover:border-[#36D9F5]/50">
            <Paperclip className="w-3.5 h-3.5 text-[#36D9F5]" />
            <span>Attach Doc</span>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleFileAttach} />
          </label>
          {attachedNames.map((n, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-[#36D9F5]/15 text-[#36D9F5] text-[11px]">
              {n}
            </span>
          ))}

          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value as "quick" | "standard" | "deep")}
            className="bg-[#091326] border border-[#1B2B43] rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="quick">Depth: Quick</option>
            <option value="standard">Depth: Standard</option>
            <option value="deep">Depth: Deep</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high" | "critical")}
            className="bg-[#091326] border border-[#1B2B43] rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="low">Priority: Low</option>
            <option value="medium">Priority: Medium</option>
            <option value="high">Priority: High</option>
            <option value="critical">Priority: Critical</option>
          </select>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "autonomous" | "supervised")}
            className="bg-[#091326] border border-[#1B2B43] rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="autonomous">Mode: Autonomous</option>
            <option value="supervised">Mode: Supervised (HITL)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || !objective.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#36D9F5] to-[#5587FF] text-[#050914] font-semibold text-xs shadow-[0_0_20px_rgba(54,217,245,0.35)] hover:opacity-95 disabled:opacity-40 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{submitting ? "Dispatching..." : "Execute Objective"}</span>
        </button>
      </div>
    </form>
  );
}
