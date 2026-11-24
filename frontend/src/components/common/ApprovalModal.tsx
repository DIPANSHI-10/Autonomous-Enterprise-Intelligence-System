import { CheckCircle2, ShieldAlert, X, XCircle } from "lucide-react";
import { useState } from "react";
import { api } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";

export function ApprovalModal({ onClose }: { onClose: () => void }) {
  const approvals = useAppStore((s) => s.approvals);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const addToast = useAppStore((s) => s.addToast);
  const [note, setNote] = useState("");

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    try {
      await api.decideApproval(id, decision, note);
      addToast({
        title: decision === "approved" ? "Workflow Approved" : "Workflow Rejected",
        description: "LangGraph checkpoint resumed with your authorization decision.",
        variant: decision === "approved" ? "success" : "warning",
      });
      await refreshAll();
    } catch (err) {
      addToast({ title: "Error", description: String(err), variant: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl max-w-2xl w-full p-6 border-[#FF9A42]/40">
        <div className="flex items-center justify-between pb-4 border-b border-[#1B2B43]">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#FF9A42]" />
            <h2 className="text-lg font-semibold text-white">Human-in-the-Loop Approval Gate</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {approvals.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No pending approval requests.</p>
          ) : (
            approvals.map((app) => (
              <div key={app.id} className="p-4 rounded-xl bg-[#050914]/80 border border-[#1B2B43] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#FF9A42]/20 text-[#FF9A42]">
                    Agent: {app.requesting_agent}
                  </span>
                  <span className="text-xs text-slate-400">Task {app.task_id.slice(0, 8)}</span>
                </div>
                <p className="text-sm font-semibold text-white">{app.requested_action}</p>
                <p className="text-xs text-slate-300">{app.reason}</p>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional reviewer note..."
                  className="w-full bg-[#0C1729] border border-[#1B2B43] rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDecision(app.id, "rejected")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs hover:bg-rose-500/30"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleDecision(app.id, "approved")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#42D6A4]/20 border border-[#42D6A4]/40 text-[#42D6A4] text-xs hover:bg-[#42D6A4]/30"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Resume
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
