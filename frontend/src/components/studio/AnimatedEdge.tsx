import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const status = (data?.status as string) || "pending";
  const stroke =
    status === "running"
      ? "#36D9F5"
      : status === "completed"
      ? "#42D6A4"
      : status === "failed"
      ? "#FB7185"
      : "#334155";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth: status === "running" ? 3 : 2,
          strokeDasharray: status === "pending" ? "6 4" : undefined,
        }}
      />
      {(status === "running" || status === "completed") && (
        <circle r={status === "running" ? 4.5 : 3} fill={stroke}>
          <animateMotion dur={status === "running" ? "1.4s" : "3s"} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}
