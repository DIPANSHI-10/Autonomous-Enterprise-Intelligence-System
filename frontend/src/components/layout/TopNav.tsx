import { Bell, Search, ShieldCheck, Sparkles, User, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { ApprovalModal } from "../common/ApprovalModal";

export function TopNav() {
  const globalSearch = useAppStore((s) => s.globalSearch);
  const setGlobalSearch = useAppStore((s) => s.setGlobalSearch);
  const sseConnected = useAppStore((s) => s.sseConnected);
  const approvals = useAppStore((s) => s.approvals);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const toggleReducedMotion = useAppStore((s) => s.toggleReducedMotion);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  return (
    <>
      <header className="h-14 shrink-0 border-b border-[#1B2B43] bg-[#091326]/90 backdrop-blur-md px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search tasks, agents, reports, or knowledge base..."
              className="w-full bg-[#0C1729] border border-[#1B2B43] rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#36D9F5]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${
              sseConnected
                ? "border-[#42D6A4]/40 bg-[#42D6A4]/10 text-[#42D6A4]"
                : "border-[#FF9A42]/40 bg-[#FF9A42]/10 text-[#FF9A42]"
            }`}
          >
            {sseConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{sseConnected ? "Live Stream" : "Reconnecting"}</span>
          </div>

          <button
            onClick={toggleReducedMotion}
            title="Toggle Reduced Motion"
            className={`px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 transition ${
              reducedMotion
                ? "border-[#A66CFF]/60 bg-[#A66CFF]/15 text-[#A66CFF]"
                : "border-[#1B2B43] bg-[#0C1729] text-slate-300 hover:border-[#36D9F5]/40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{reducedMotion ? "Reduced Motion" : "Full FX"}</span>
          </button>

          <button
            onClick={() => setShowApprovalModal(true)}
            className="relative p-2 rounded-lg border border-[#1B2B43] bg-[#0C1729] hover:border-[#36D9F5]/50 text-slate-300"
            title="Notifications & Pending Approvals"
          >
            <Bell className="w-4 h-4" />
            {approvals.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF9A42] text-[#050914] text-[10px] font-bold flex items-center justify-center">
                {approvals.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-[#1B2B43]">
            <div className="w-7 h-7 rounded-full bg-[#5587FF]/20 border border-[#5587FF]/50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-[#5587FF]" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-slate-200 leading-none">Enterprise Lead</p>
              <p className="text-[10px] text-[#42D6A4] flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3" /> Authorized
              </p>
            </div>
          </div>
        </div>
      </header>

      {showApprovalModal && <ApprovalModal onClose={() => setShowApprovalModal(false)} />}
    </>
  );
}
