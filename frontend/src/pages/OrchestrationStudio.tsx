import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { GlassCard } from "../components/common/GlassCard";
import { AgentNode, type AgentNodeData } from "../components/studio/AgentNode";
import { AnimatedEdge } from "../components/studio/AnimatedEdge";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { AgentDefinition, AgentExecutionItem, WorkflowEventItem } from "../types";

const nodeTypes = { agentNode: AgentNode };
const edgeTypes = { animatedEdge: AnimatedEdge };

export function OrchestrationStudio() {
  const agents = useAppStore((s) => s.agents);
  const tasks = useAppStore((s) => s.tasks);
  const activeTaskId = useAppStore((s) => s.activeTaskId);
  const setActiveTaskId = useAppStore((s) => s.setActiveTaskId);
  const activeExecutions = useAppStore((s) => s.activeExecutions);
  const activeEvents = useAppStore((s) => s.activeEvents);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const addToast = useAppStore((s) => s.addToast);

  const [inspectedAgent, setInspectedAgent] = useState<{
    agent: AgentDefinition;
    exec?: AgentExecutionItem;
  } | null>(null);
  const [inspectedEdge, setInspectedEdge] = useState<{
    source: string;
    target: string;
    event?: WorkflowEventItem;
  } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [paused, setPaused] = useState(false);

  const activeTask = tasks.find((t) => t.id === activeTaskId) || tasks[0];

  const { nodes, edges } = useMemo(() => {
    const getExec = (id: string) => activeExecutions.find((e) => e.agent_id === id);
    const getLogs = (id: string) =>
      activeEvents.filter((ev) => ev.source_agent === id).map((ev) => ev.message);

    const studioDefs: Array<{
      id: string;
      label: string;
      category: AgentNodeData["category"];
      pos: { x: number; y: number };
    }> = [
      { id: "supervisor", label: "Supervisor Agent", category: "supervisor", pos: { x: 40, y: 190 } },
      { id: "research", label: "Research Agent", category: "research", pos: { x: 380, y: 40 } },
      { id: "analyst", label: "Analysis Agent", category: "analysis", pos: { x: 380, y: 310 } },
      { id: "report", label: "Writing Agent", category: "writing", pos: { x: 740, y: 40 } },
      { id: "strategy", label: "Decision Agent", category: "decision", pos: { x: 740, y: 310 } },
    ];

    const builtNodes: Node[] = studioDefs
      .filter((def) => filterCategory === "all" || def.category === filterCategory)
      .map((def) => {
        const ag = agents.find((a) => a.id === def.id);
        const exec = getExec(def.id);
        const status =
          activeTask?.current_agent === def.id
            ? "running"
            : exec?.status || "pending";
        return {
          id: def.id,
          type: "agentNode",
          position: def.pos,
          data: {
            agentId: def.id,
            label: def.label,
            category: def.category,
            status,
            currentTask: exec?.current_task || ag?.role || "Awaiting task dispatch",
            progress: status === "completed" ? 100 : status === "running" ? exec?.progress || 55 : 0,
            tools: ag?.tools || ["langgraph_node"],
            summary: exec
              ? `Duration: ${exec.duration_ms}ms · Tokens: ${exec.tokens_used}`
              : "Ready for LangGraph dispatch",
            description: ag?.description || "",
            logs: getLogs(def.id),
          } satisfies AgentNodeData,
        };
      });

    const edgePairs: Array<[string, string]> = [
      ["supervisor", "research"],
      ["research", "analyst"],
      ["analyst", "strategy"],
      ["strategy", "report"],
      ["supervisor", "strategy"],
    ];

    const builtEdges: Edge[] = edgePairs.map(([src, tgt]) => {
      const srcExec = getExec(src);
      const tgtExec = getExec(tgt);
      const ev = activeEvents.find((e) => e.source_agent === src && e.target_agent === tgt);
      const edgeStatus =
        tgtExec?.status === "running"
          ? "running"
          : srcExec?.status === "completed" && tgtExec?.status === "completed"
          ? "completed"
          : ev?.status === "failed"
          ? "failed"
          : "pending";
      return {
        id: `${src}-${tgt}`,
        source: src,
        target: tgt,
        type: "animatedEdge",
        data: { status: paused ? "pending" : edgeStatus, event: ev },
      };
    });

    return { nodes: builtNodes, edges: builtEdges };
  }, [agents, activeExecutions, activeEvents, activeTask, filterCategory, paused]);

  const handleRetryTask = async () => {
    if (!activeTask) return;
    await api.retryTask(activeTask.id);
    addToast({ title: "Workflow Re-dispatched", description: `Retrying task ${activeTask.id.slice(0, 8)}`, variant: "info" });
    void refreshAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Agent Orchestration Studio</h2>
          <p className="text-xs text-slate-400">
            Interactive LangGraph multi-agent execution topology with live event pulses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeTask?.id || ""}
            onChange={(e) => setActiveTaskId(e.target.value)}
            className="bg-[#0C1729] border border-[#1B2B43] rounded-lg px-3 py-1.5 text-xs text-slate-200 max-w-xs"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.status.toUpperCase()} · {t.objective.slice(0, 40)}...
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0C1729] border border-[#1B2B43] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="all">All Agents</option>
            <option value="research">Research</option>
            <option value="analysis">Analysis</option>
            <option value="writing">Writing</option>
            <option value="decision">Decision</option>
          </select>

          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C1729] border border-[#1B2B43] text-xs text-slate-200 hover:border-[#36D9F5]/50"
          >
            {paused ? <Play className="w-3.5 h-3.5 text-[#42D6A4]" /> : <Pause className="w-3.5 h-3.5 text-[#FF9A42]" />}
            <span>{paused ? "Resume FX" : "Pause FX"}</span>
          </button>

          <button
            onClick={handleRetryTask}
            disabled={!activeTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#36D9F5]/15 border border-[#36D9F5]/40 text-xs text-[#36D9F5] hover:bg-[#36D9F5]/25 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <GlassCard className={`${inspectedAgent || inspectedEdge ? "xl:col-span-8" : "xl:col-span-12"} h-[580px] overflow-hidden`}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            onNodeClick={(_, node) => {
              const ag = agents.find((a) => a.id === node.id);
              const exec = activeExecutions.find((e) => e.agent_id === node.id);
              if (ag) {
                setInspectedEdge(null);
                setInspectedAgent({ agent: ag, exec });
              }
            }}
            onEdgeClick={(_, edge) => {
              setInspectedAgent(null);
              setInspectedEdge({
                source: edge.source,
                target: edge.target,
                event: (edge.data as { event?: WorkflowEventItem })?.event,
              });
            }}
          >
            <Background color="#1B2B43" gap={22} />
            <Controls className="!bg-[#0C1729] !border-[#1B2B43] !text-slate-200" />
            <MiniMap
              nodeColor="#36D9F5"
              maskColor="rgba(5, 9, 20, 0.75)"
              className="!bg-[#091326] !border-[#1B2B43]"
            />
          </ReactFlow>
        </GlassCard>

        {inspectedAgent && (
          <GlassCard className="xl:col-span-4 p-4 h-[580px] overflow-y-auto space-y-3 border-[#36D9F5]/40">
            <div className="flex items-center justify-between border-b border-[#1B2B43] pb-2">
              <div>
                <h3 className="text-sm font-semibold text-[#36D9F5]">{inspectedAgent.agent.name}</h3>
                <p className="text-xs text-slate-400">{inspectedAgent.agent.role}</p>
              </div>
              <button onClick={() => setInspectedAgent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs space-y-2">
              <p className="text-slate-300">{inspectedAgent.agent.description}</p>
              <div className="p-2.5 rounded-lg bg-[#050914] border border-[#1B2B43]">
                <p className="text-[11px] text-slate-400">System Instructions</p>
                <p className="text-slate-200 mt-0.5">{inspectedAgent.agent.system_instructions}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-[#050914] border border-[#1B2B43]">
                  <p className="text-[10px] text-slate-400">Model</p>
                  <p className="font-mono text-white">{inspectedAgent.agent.model_name}</p>
                </div>
                <div className="p-2 rounded bg-[#050914] border border-[#1B2B43]">
                  <p className="text-[10px] text-slate-400">Latency / Tokens</p>
                  <p className="font-mono text-[#42D6A4]">
                    {inspectedAgent.exec ? `${inspectedAgent.exec.duration_ms}ms / ${inspectedAgent.exec.tokens_used}` : "N/A"}
                  </p>
                </div>
              </div>
              {inspectedAgent.exec && (
                <>
                  <div className="p-2.5 rounded-lg bg-[#050914] border border-[#1B2B43]">
                    <p className="text-[11px] text-slate-400 mb-1">Input Received</p>
                    <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap">
                      {JSON.stringify(inspectedAgent.exec.input_data, null, 2)}
                    </pre>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#050914] border border-[#1B2B43]">
                    <p className="text-[11px] text-slate-400 mb-1">Output Generated</p>
                    <pre className="text-[10px] font-mono text-[#36D9F5] whitespace-pre-wrap">
                      {JSON.stringify(inspectedAgent.exec.output_data, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        )}

        {inspectedEdge && (
          <GlassCard className="xl:col-span-4 p-4 h-[580px] overflow-y-auto space-y-3 border-[#A66CFF]/40">
            <div className="flex items-center justify-between border-b border-[#1B2B43] pb-2">
              <h3 className="text-sm font-semibold text-[#A66CFF]">Connection Transition</h3>
              <button onClick={() => setInspectedEdge(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs space-y-2">
              <p>
                <span className="text-slate-400">Source Agent:</span>{" "}
                <span className="font-mono text-white">{inspectedEdge.source}</span>
              </p>
              <p>
                <span className="text-slate-400">Destination Agent:</span>{" "}
                <span className="font-mono text-white">{inspectedEdge.target}</span>
              </p>
              <p>
                <span className="text-slate-400">Message:</span>{" "}
                <span className="text-slate-200">
                  {inspectedEdge.event?.message || "Awaiting state handoff in current workflow."}
                </span>
              </p>
              <p>
                <span className="text-slate-400">Status:</span>{" "}
                <span className="font-mono text-[#42D6A4]">{inspectedEdge.event?.status || "pending"}</span>
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
