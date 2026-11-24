import { Database, Search, Trash2, Upload } from "lucide-react";
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
  const [results, setResults] = useState<
    Array<{ chunk_id: string; filename: string; content: string; relevance_score: number }>
  >([]);

  const load = async () => setDocs(await api.listDocuments());

  useEffect(() => {
    void load();
  }, []);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await api.searchDocuments(query.trim());
    setResults(res.results);
  };

  const handleDelete = async (id: string) => {
    await api.deleteDocument(id);
    await load();
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5587FF] text-white text-xs font-semibold"
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>
          </form>
        </GlassCard>
      </div>

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
