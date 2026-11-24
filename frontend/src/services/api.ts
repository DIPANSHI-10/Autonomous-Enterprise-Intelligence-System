import type {
  AgentDefinition,
  AgentExecutionItem,
  ApprovalItem,
  DashboardMetrics,
  ReportItem,
  TaskItem,
  WorkflowEventItem,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(errText || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string; application: string }>("/health"),
  dashboardMetrics: () => request<DashboardMetrics>("/dashboard/metrics"),

  // Projects
  listProjects: () =>
    request<Array<{ id: string; name: string; description: string; status: string; updated_at: string }>>(
      "/projects"
    ),
  createProject: (body: { name: string; description: string }) =>
    request<{ id: string; name: string; description: string; status: string }>("/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateProject: (id: string, body: { name?: string; description?: string; status?: string }) =>
    request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Tasks
  listTasks: (projectId?: string) =>
    request<TaskItem[]>(projectId ? `/tasks?project_id=${encodeURIComponent(projectId)}` : "/tasks"),
  createTask: (body: {
    objective: string;
    project_id?: string | null;
    research_depth: string;
    priority: string;
    execution_mode: string;
    attached_document_ids?: string[];
  }) => request<TaskItem>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  getTaskDetail: (taskId: string) =>
    request<{ task: TaskItem; executions: AgentExecutionItem[]; events: WorkflowEventItem[] }>(
      `/tasks/${taskId}`
    ),
  cancelTask: (taskId: string) => request(`/tasks/${taskId}/cancel`, { method: "POST" }),
  retryTask: (taskId: string) => request(`/tasks/${taskId}/retry`, { method: "POST" }),

  // Agents
  listAgents: () => request<AgentDefinition[]>("/agents"),
  updateAgent: (
    id: string,
    body: { model_provider?: string; model_name?: string; system_instructions?: string; enabled?: boolean }
  ) => request<AgentDefinition>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Documents / RAG
  listDocuments: () =>
    request<
      Array<{
        id: string;
        filename: string;
        collection: string;
        content_type: string;
        file_size_bytes: number;
        chunk_count: number;
        status: string;
        created_at: string;
      }>
    >("/documents"),
  uploadDocument: async (file: File, collection = "default") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("collection", collection);
    const res = await fetch(`${BASE}/documents/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  searchDocuments: (query: string) =>
    request<{
      query: string;
      results: Array<{
        chunk_id: string;
        document_id: string;
        filename: string;
        collection: string;
        content: string;
        relevance_score: number;
      }>;
    }>(`/documents/search?query=${encodeURIComponent(query)}`),
  deleteDocument: (id: string) => request(`/documents/${id}`, { method: "DELETE" }),

  // Memory
  listMemory: (layer?: string, query?: string) => {
    const params = new URLSearchParams();
    if (layer) params.set("layer", layer);
    if (query) params.set("query", query);
    const q = params.toString();
    return request<
      Array<{
        id: string;
        task_id?: string | null;
        layer: string;
        category: string;
        content: string;
        source: string;
        created_at: string;
      }>
    >(`/memory${q ? `?${q}` : ""}`);
  },
  createMemory: (body: { layer: string; category: string; content: string; source?: string }) =>
    request("/memory", { method: "POST", body: JSON.stringify(body) }),
  deleteMemory: (id: string) => request(`/memory/${id}`, { method: "DELETE" }),

  // Reports
  listReports: () => request<ReportItem[]>("/reports"),
  getReportPdfUrl: (id: string) => `${BASE}/reports/${id}/pdf`,

  // Logs
  listLogs: (limit = 100) => request<WorkflowEventItem[]>(`/logs?limit=${limit}`),

  // Approvals
  listApprovals: (status?: string) =>
    request<ApprovalItem[]>(status ? `/approvals?status=${status}` : "/approvals"),
  decideApproval: (id: string, decision: "approved" | "rejected", reviewer_note = "") =>
    request(`/approvals/${id}/decide`, {
      method: "POST",
      body: JSON.stringify({ decision, reviewer_note }),
    }),

  // MCP & A2A & Integrations & Settings
  listMcpServers: () =>
    request<
      Array<{
        id: string;
        name: string;
        status: string;
        transport: string;
        permissions: string[];
        tools: Array<{ name: string; description: string }>;
      }>
    >("/mcp/servers"),
  invokeMcpTool: (body: { server_id: string; tool_name: string; arguments: Record<string, unknown> }) =>
    request("/mcp/invoke", { method: "POST", body: JSON.stringify(body) }),
  listMcpHistory: () =>
    request<
      Array<{
        id: string;
        agent_id: string;
        tool_name: string;
        mcp_server: string;
        status: string;
        duration_ms: number;
        result_summary: string;
        created_at: string;
      }>
    >("/mcp/history"),
  listA2AAgents: () => request<Array<{ agent_id: string; name: string; role: string; capabilities: string[] }>>("/a2a/agents"),
  listIntegrations: () =>
    request<{
      integrations: Array<{ id: string; name: string; category: string; status: string; endpoint?: string; enabled: boolean }>;
      llm_providers: Array<{ id: string; name: string; configured: boolean; models: string[] }>;
    }>("/integrations"),
  getSettings: () =>
    request<{
      app_name: string;
      environment: string;
      default_llm_provider: string;
      default_llm_model: string;
      max_workflow_retries: number;
      require_approval_for_reports: boolean;
      configured_llm_providers: Record<string, boolean>;
    }>("/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    request("/settings", { method: "PATCH", body: JSON.stringify(body) }),
};
