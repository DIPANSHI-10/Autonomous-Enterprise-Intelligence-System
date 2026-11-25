import { Database, MessageSquare, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export function KnowledgeBasePage() {
  const addToast = useAppStore((s) => s.addToast);
  const [docs, setDocs] = useState<
    Array<{
      id: string;
      filename: string;
      collection: string;
      file_size_bytes: number;
      chunk_count: number;
      status: string;
      created_at: string;
    }>
  >([]);
  const [collection, setCollection] = useState("enterprise-docs");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [ragAnswer, setRagAnswer] = useState<{
    answer: string;
    sufficient_evidence: boolean;
    llm_configured: boolean;
    citations: Array<{ filename: string; chunk_index: number; relevance_score: number }>;
  } | null>(null);
  const [results, setResults] = useState<
    Array<{ chunk_id: string; filename: string; content: string; relevance_score: number }>
  >([]);

  const load = async () => {
    try {
      setDocs(await api.listDocuments());
    } catch (err) {
      addToast({ title: "Load Failed", description: String(err), variant: "error" });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const res = await api.uploadDocument(file, collection);
      addToast({
        title: "Document Indexed",
        description: `${res.filename} split into ${res.chunk_count} vector chunks.`,
        variant: "success",
      });
      await load();
    } catch (err) {
      addToast({ title: "Upload Failed", description: String(err), variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setRagAnswer(null);
    try {
      const res = await api.searchDocuments(query.trim());
      setResults(res.results);
    } catch (err) {
      addToast({ title: "Search Failed", description: String(err), variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.askKnowledgeBase(query.trim());
      setRagAnswer(res);
      setResults(res.results);
    } catch (err) {
      addToast({ title: "RAG Query Failed", description: String(err), variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteDocument(id);
      await load();
    } catch (err) {
      addToast({ title: "Delete Failed", description: String(err), variant: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Enterprise Knowledge Base (RAG)</h2>
        <p className="text-xs text-slate-400">
          Upload PDF, DOCX, TXT, or Markdown files for hybrid semantic + keyword retrieval
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#36D9F5]">
            Ingest Document
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="Collection name"
              className="bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-xs text-white flex-1"
            />
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#36D9F5] text-[#050914] font-semibold text-xs">
              <Upload className="w-4 h-4" /> Upload File
              <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5587FF]">
            Hybrid Vector + Keyword Search
          </h3>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query indexed knowledge chunks..."
              className="flex-1 bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-xs text-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5587FF] text-white text-xs font-semibold disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
            <button
              type="button"
              onClick={handleAsk}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#A66CFF] text-white text-xs font-semibold disabled:opacity-50"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Ask RAG
            </button>
          </form>
        </GlassCard>
      </div>

      {ragAnswer && (
        <GlassCard className="p-4 space-y-2 border-[#A66CFF]/40">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-semibold text-[#A66CFF]">Grounded RAG Synthesis</h3>
            <span className="font-mono text-[11px] text-slate-400">
              {ragAnswer.llm_configured ? "LLM Grounded" : "LLM Unconfigured (Excerpts Returned)"}
            </span>
          </div>
          <p className="text-xs text-slate-200 whitespace-pre-wrap">{ragAnswer.answer}</p>
          {ragAnswer.citations.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {ragAnswer.citations.map((c, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#050914] border border-[#1B2B43] text-[#36D9F5]"
                >
                  {c.filename} (chunk {c.chunk_index} · {c.relevance_score})
                </span>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {results.length > 0 && (
        <GlassCard className="p-4 space-y-2">
          <h3 className="text-xs font-semibold text-[#42D6A4]">Retrieved Chunks ({results.length})</h3>
          {results.map((r) => (
            <div key={r.chunk_id} className="p-3 rounded-lg bg-[#050914] border border-[#1B2B43] text-xs">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#36D9F5] font-medium">{r.filename}</span>
                <span className="font-mono text-[#42D6A4]">Score: {r.relevance_score}</span>
              </div>
              <p className="text-slate-300">{r.content}</p>
            </div>
          ))}
        </GlassCard>
      )}

      <GlassCard className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#36D9F5]" /> Indexed Documents ({docs.length})
        </h3>
        <div className="space-y-2">
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[#050914]/70 border border-[#1B2B43] text-xs"
            >
              <div>
                <p className="font-medium text-white">{d.filename}</p>
                <p className="text-[11px] text-slate-400">
                  Collection: {d.collection} · {d.chunk_count} chunks · {(d.file_size_bytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <button onClick={() => handleDelete(d.id)} className="text-rose-400 hover:text-rose-300 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
