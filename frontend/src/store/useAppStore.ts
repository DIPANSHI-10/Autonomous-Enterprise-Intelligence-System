import { create } from "zustand";
import { api } from "../services/api";
import type {
  AgentDefinition,
  AgentExecutionItem,
  ApprovalItem,
  DashboardMetrics,
  PageId,
  TaskItem,
  WorkflowEventItem,
} from "../types";

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: "info" | "success" | "warning" | "error";
}

interface AppState {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;

  metrics: DashboardMetrics | null;
  agents: AgentDefinition[];
  tasks: TaskItem[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  activeExecutions: AgentExecutionItem[];
  activeEvents: WorkflowEventItem[];
  approvals: ApprovalItem[];
  liveEvents: WorkflowEventItem[];
  toasts: ToastMessage[];
  sseConnected: boolean;

  addToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
  refreshAll: () => Promise<void>;
  refreshTaskDetail: (taskId: string) => Promise<void>;
  submitTask: (payload: {
    objective: string;
    project_id?: string | null;
    research_depth: string;
    priority: string;
    execution_mode: string;
    attached_document_ids?: string[];
  }) => Promise<TaskItem>;
  connectEventStream: () => () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activePage: "neural-dashboard",
  setActivePage: (page) => set({ activePage: page }),
  reducedMotion: false,
  toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
  globalSearch: "",
  setGlobalSearch: (q) => set({ globalSearch: q }),

  metrics: null,
  agents: [],
  tasks: [],
  activeTaskId: null,
  setActiveTaskId: (id) => {
    set({ activeTaskId: id });
    if (id) {
      void get().refreshTaskDetail(id);
    }
  },
  activeExecutions: [],
  activeEvents: [],
  approvals: [],
  liveEvents: [],
  toasts: [],
  sseConnected: false,

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  refreshAll: async () => {
    try {
      const [metrics, agents, tasks, approvals] = await Promise.all([
        api.dashboardMetrics(),
        api.listAgents(),
        api.listTasks(),
        api.listApprovals("pending"),
      ]);
      const currentTaskId = get().activeTaskId || tasks[0]?.id || null;
      set({ metrics, agents, tasks, approvals, activeTaskId: currentTaskId });
      if (currentTaskId) {
        await get().refreshTaskDetail(currentTaskId);
      }
    } catch {
      // Backend might be starting up
    }
  },

  refreshTaskDetail: async (taskId) => {
    try {
      const detail = await api.getTaskDetail(taskId);
      set({
        activeExecutions: detail.executions,
        activeEvents: detail.events,
      });
    } catch {
      // ignore
    }
  },

  submitTask: async (payload) => {
    const task = await api.createTask(payload);
    set((s) => ({
      tasks: [task, ...s.tasks],
      activeTaskId: task.id,
    }));
    get().addToast({
      title: "Autonomous Workflow Launched",
      description: `Task ${task.id.slice(0, 8)} dispatched to Supervisor Agent.`,
      variant: "info",
    });
    void get().refreshAll();
    return task;
  },

  connectEventStream: () => {
    const es = new EventSource("/api/events/stream");
    es.onopen = () => set({ sseConnected: true });
    es.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data) as WorkflowEventItem;
        if (parsed.event_type === "connected") {
          set({ sseConnected: true });
          return;
        }
        set((s) => ({
          liveEvents: [parsed, ...s.liveEvents].slice(0, 80),
        }));
        if (parsed.event_type === "task_completed") {
          get().addToast({
            title: "Intelligence Report Ready",
            description: parsed.message,
            variant: "success",
          });
        } else if (parsed.event_type === "approval_requested") {
          get().addToast({
            title: "Human Approval Required",
            description: parsed.message,
            variant: "warning",
          });
        }
        void get().refreshAll();
      } catch {
        // ignore malformed keepalive
      }
    };
    es.onerror = () => set({ sseConnected: false });
    return () => es.close();
  },
}));
