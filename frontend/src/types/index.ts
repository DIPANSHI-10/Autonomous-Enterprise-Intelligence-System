export type PageId =
  | "neural-dashboard"
  | "orchestration-studio"
  | "projects"
  | "agents"
  | "research-workspace"
  | "knowledge-base"
  | "memory"
  | "reports"
  | "execution-logs"
  | "analytics"
  | "integrations"
  | "settings";

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  system_instructions: string;
  model_provider: string;
  model_name: string;
  tools: string[];
  capabilities: string[];
  color_theme: string;
  enabled: boolean;
}

export interface TaskItem {
  id: string;
  project_id?: string | null;
  objective: string;
  research_depth: "quick" | "standard" | "deep";
  priority: "low" | "medium" | "high" | "critical";
  execution_mode: "autonomous" | "supervised";
  status: string;
  progress: number;
  current_agent?: string | null;
  plan: Array<{ step: number; agent: string; goal: string }>;
  result_summary?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface AgentExecutionItem {
  id: string;
  agent_id: string;
  agent_name: string;
  status: string;
  current_task: string;
  progress: number;
  model_used: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  tokens_used: number;
  duration_ms: number;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface WorkflowEventItem {
  id?: string;
  task_id?: string;
  event_type: string;
  source_agent?: string | null;
  target_agent?: string | null;
  status: string;
  message: string;
  payload?: Record<string, unknown>;
  duration_ms?: number;
  created_at?: string;
  timestamp?: string;
}

export interface DashboardMetrics {
  operational_index: {
    system_health: number;
    task_success_rate: number;
    completed_tasks: number;
    failed_tasks: number;
    total_tasks: number;
    avg_execution_time_ms: number;
  };
  cognitive_load: {
    active_agents: number;
    enabled_agents: number;
    running_tasks: number;
    queued_tasks: number;
    api_activity_events: number;
    total_tool_calls: number;
  };
  diagnostics: Record<string, string>;
  system_health: {
    score: number;
    status: string;
    pending_approvals: number;
    indexed_documents: number;
    memory_records: number;
    total_tokens: number;
  };
  charts: {
    throughput: Array<{ label: string; progress: number; status: string }>;
    agent_utilization: Array<{
      agent_id: string;
      executions: number;
      avg_duration_ms: number;
      tokens_used: number;
    }>;
  };
}

export interface ApprovalItem {
  id: string;
  task_id: string;
  requesting_agent: string;
  requested_action: string;
  reason: string;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  reviewer_note?: string | null;
  created_at: string;
}

export interface TaskReportSummary {
  id: string;
  task_id: string;
  title: string;
  executive_summary: string;
  has_pdf: boolean;
  pdf_url: string;
  created_at: string;
}

export interface ReportItem {
  id: string;
  task_id: string;
  title: string;
  executive_summary: string;
  content_markdown: string;
  citations: Array<{ title: string; url: string; type: string }>;
  analytics_data: Record<string, unknown>;
  has_pdf: boolean;
  created_at: string;
}
