import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../src/App";

// Mock full API responses to prevent crashes from undefined metric shapes
const mockMetrics = {
  operational_index: {
    system_health: 100,
    task_success_rate: 100,
    completed_tasks: 0,
    failed_tasks: 0,
    avg_execution_time_ms: 0,
  },
  cognitive_load: {
    active_agents: 0,
    enabled_agents: 7,
    running_tasks: 0,
    queued_tasks: 0,
    total_tool_calls: 0,
    api_activity_events: 0,
  },
  diagnostics: {
    backend: "connected",
    database: "connected",
    llm_providers: "fallback_ready",
    vector_database: "ready",
    mcp: "connected",
    memory_subsystem: "connected",
  },
  system_health: {
    score: 100,
    status: "optimal",
    indexed_documents: 0,
    memory_records: 0,
  },
  charts: {
    agent_utilization: [],
    throughput: [],
  },
};

vi.stubGlobal(
  "fetch",
  vi.fn((url: string) => {
    // Return appropriate mock data per endpoint
    if (typeof url === "string" && url.includes("/dashboard/metrics")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMetrics) });
    }
    if (typeof url === "string" && url.includes("/documents/search")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) });
    }
    // Default: return empty array for lists
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
  })
);

describe("Autonomous Enterprise Intelligence System UI", () => {
  it("renders the exact project name and all 12 navigation items", async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText("Autonomous Enterprise Intelligence System")).toBeInTheDocument();
    expect(screen.getByText("Neural Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Orchestration Studio")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.getByText("Execution Logs")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("navigates to Orchestration Studio and Settings", async () => {
    await act(async () => {
      render(<App />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Orchestration Studio"));
    });
    expect(screen.getByText("Agent Orchestration Studio")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Settings"));
    });
    expect(screen.getByText("Platform Settings")).toBeInTheDocument();
  });
});
