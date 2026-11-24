import { X } from "lucide-react";
import { useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { TopNav } from "./components/layout/TopNav";
import { AgentsPage } from "./pages/AgentsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ExecutionLogsPage } from "./pages/ExecutionLogsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { KnowledgeBasePage } from "./pages/KnowledgeBasePage";
import { MemoryPage } from "./pages/MemoryPage";
import { NeuralDashboard } from "./pages/NeuralDashboard";
import { OrchestrationStudio } from "./pages/OrchestrationStudio";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ResearchWorkspacePage } from "./pages/ResearchWorkspacePage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAppStore } from "./store/useAppStore";

export function App() {
  const activePage = useAppStore((s) => s.activePage);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const connectEventStream = useAppStore((s) => s.connectEventStream);
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  useEffect(() => {
    void refreshAll();
    const disconnect = connectEventStream();
    const timer = setInterval(() => void refreshAll(), 10000);
    return () => {
      disconnect();
      clearInterval(timer);
    };
  }, [refreshAll, connectEventStream]);

  const renderPage = () => {
    switch (activePage) {
      case "neural-dashboard":
        return <NeuralDashboard />;
      case "orchestration-studio":
        return <OrchestrationStudio />;
      case "projects":
        return <ProjectsPage />;
      case "agents":
        return <AgentsPage />;
      case "research-workspace":
        return <ResearchWorkspacePage />;
      case "knowledge-base":
        return <KnowledgeBasePage />;
      case "memory":
        return <MemoryPage />;
      case "reports":
        return <ReportsPage />;
      case "execution-logs":
        return <ExecutionLogsPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "integrations":
        return <IntegrationsPage />;
      case "settings":
        return <SettingsPage />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050914] text-slate-100 neural-grid-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="flex-1 p-5 overflow-y-auto">{renderPage()}</main>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-panel rounded-xl p-3 border-[#36D9F5]/40 shadow-2xl flex items-start justify-between gap-3"
          >
            <div>
              <p className="text-xs font-semibold text-white">{t.title}</p>
              {t.description && <p className="text-[11px] text-slate-300 mt-0.5">{t.description}</p>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
