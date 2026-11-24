import { Archive, FolderKanban, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

export function ProjectsPage() {
  const tasks = useAppStore((s) => s.tasks);
  const addToast = useAppStore((s) => s.addToast);
  const [projects, setProjects] = useState<
    Array<{ id: string; name: string; description: string; status: string; updated_at: string }>
  >([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const load = async () => {
    const data = await api.listProjects();
    setProjects(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createProject({ name: name.trim(), description: desc.trim() });
    setName("");
    setDesc("");
    addToast({ title: "Project Created", variant: "success" });
    await load();
  };

  const toggleArchive = async (id: string, current: string) => {
    await api.updateProject(id, { status: current === "archived" ? "active" : "archived" });
    await load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Enterprise Projects</h2>
        <p className="text-xs text-slate-400">Organize research tasks, documents, and strategic intelligence reports</p>
      </div>

      <GlassCard className="p-4">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name..."
            className="md:col-span-4 bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Project description and intelligence scope..."
            className="md:col-span-6 bg-[#050914] border border-[#1B2B43] rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="md:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#36D9F5] text-[#050914] font-semibold text-xs py-2"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </form>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => {
          const projTasks = tasks.filter((t) => t.project_id === p.id);
          return (
            <GlassCard key={p.id} className="p-4 flex flex-col justify-between gap-3" hoverGlow>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#36D9F5]" />
                    <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      p.status === "active"
                        ? "bg-[#42D6A4]/20 text-[#42D6A4]"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{p.description || "No description provided."}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-[#1B2B43] text-xs">
                <span className="text-slate-400">{projTasks.length} linked tasks</span>
                <button
                  onClick={() => toggleArchive(p.id, p.status)}
                  className="inline-flex items-center gap-1 text-slate-300 hover:text-[#FF9A42]"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {p.status === "archived" ? "Restore" : "Archive"}
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
