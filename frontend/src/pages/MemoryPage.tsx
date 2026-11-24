import { Brain, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";

export function MemoryPage() {
  const [memories, setMemories] = useState<
    Array<{ id: string; layer: string; category: string; content: string; source: string; created_at: string }>
  >([]);
  const [layer, setLayer] = useState("");
  const [query, setQuery] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newLayer, setNewLayer] = useState("long_term");

  const load = async () => setMemories(await api.listMemory(layer || undefined, query || undefined));

  useEffect(() => {
    void load();
  }, [layer]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    await api.createMemory({ layer: newLayer, category: "user_preference", content: newContent.trim() });
    setNewContent("");
    await load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Persistent Memory System</h2>
        <p className="text-xs text-slate-400">Short-Term, Long-Term, and Episodic workflow memories persisted in DB</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
            <select
              value={newLayer}
              onChange={(e) => setNewLayer(e.target.value)}
              className="bg-[#050914] border border-[#1B2B43] rounded-lg px-2.5 py-2 text-xs text-white"
            >
              <option value="long_term">Long-Term</option>
              <option value="short_term">Short-Term</option>
              <option value="episodic">Episodic</option>
            </select>
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Store persistent context or preference..."
              className="flex-1 bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#A66CFF] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Store
            </button>
          </form>
        </GlassCard>

        <GlassCard className="p-4 flex gap-2">
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
            className="bg-[#050914] border border-[#1B2B43] rounded-lg px-2.5 py-2 text-xs text-white"
          >
            <option value="">All Layers</option>
            <option value="short_term">Short-Term</option>
            <option value="long_term">Long-Term</option>
            <option value="episodic">Episodic</option>
          </select>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories..."
            className="flex-1 bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-xs text-white"
          />
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#091326] border border-[#1B2B43] text-xs text-slate-200"
          >
            <Search className="w-3.5 h-3.5" /> Filter
          </button>
        </GlassCard>
      </div>

      <div className="space-y-2">
        {memories.map((m) => (
          <GlassCard key={m.id} className="p-3.5 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px]">
                <Brain className="w-3.5 h-3.5 text-[#A66CFF]" />
                <span className="font-mono px-1.5 py-0.5 rounded bg-[#A66CFF]/20 text-[#A66CFF]">
                  {m.layer}
                </span>
                <span className="text-slate-400">Source: {m.source}</span>
              </div>
              <p className="text-xs text-slate-200">{m.content}</p>
            </div>
            <button
              onClick={async () => {
                await api.deleteMemory(m.id);
                await load();
              }}
              className="text-rose-400 hover:text-rose-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
