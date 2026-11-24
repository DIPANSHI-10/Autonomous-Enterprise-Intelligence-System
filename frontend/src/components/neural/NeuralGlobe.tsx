import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAppStore } from "../../store/useAppStore";
import type { AgentDefinition } from "../../types";

interface NeuralGlobeProps {
  agents: AgentDefinition[];
  activeAgentId?: string | null;
  onSelectAgent: (agent: AgentDefinition) => void;
}

const AGENT_POSITIONS: Array<[number, number, number]> = [
  [0, 1.85, 0], // supervisor
  [1.6, 0.85, 0.8], // research
  [-1.6, 0.85, 0.8], // extraction
  [1.55, -0.9, -0.8], // analyst
  [-1.55, -0.9, -0.8], // verification
  [0.2, 0.3, 1.85], // strategy
  [0, -1.8, 0.3], // report
];

function NeuralCore({
  agents,
  activeAgentId,
  onSelectAgent,
  onHoverAgent,
}: NeuralGlobeProps & { onHoverAgent: (agent: AgentDefinition | null) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  // Outer particle cloud (1600 neural particles)
  const particleGeometry = useMemo(() => {
    const count = 1600;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color("#36D9F5");
    const c2 = new THREE.Color("#5587FF");
    const c3 = new THREE.Color("#A66CFF");

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.9 + (i % 7) * 0.04;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const mix = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
      colors[i * 3] = mix.r;
      colors[i * 3 + 1] = mix.g;
      colors[i * 3 + 2] = mix.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  // Network connection lines between agent nodes
  const lineGeometry = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < AGENT_POSITIONS.length; i++) {
      for (let j = i + 1; j < AGENT_POSITIONS.length; j++) {
        pts.push(...AGENT_POSITIONS[i], ...AGENT_POSITIONS[j]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.14;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Inner wireframe icosahedron */}
      <mesh>
        <icosahedronGeometry args={[1.15, 2]} />
        <meshBasicMaterial color="#1B2B43" wireframe transparent opacity={0.45} />
      </mesh>

      {/* Concentric glowing rings */}
      <mesh rotation={[Math.PI / 3, 0.2, 0]}>
        <torusGeometry args={[2.35, 0.012, 8, 96]} />
        <meshBasicMaterial color="#36D9F5" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 4, 0.5, 0]}>
        <torusGeometry args={[2.55, 0.008, 8, 96]} />
        <meshBasicMaterial color="#A66CFF" transparent opacity={0.25} />
      </mesh>

      {/* Neural particles */}
      <points geometry={particleGeometry}>
        <pointsMaterial size={0.032} vertexColors transparent opacity={0.85} sizeAttenuation />
      </points>

      {/* Neural connections */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#36D9F5" transparent opacity={0.28} />
      </lineSegments>

      {/* Interactive Agent Nodes */}
      {agents.slice(0, AGENT_POSITIONS.length).map((agent, idx) => {
        const pos = AGENT_POSITIONS[idx];
        const isActive = activeAgentId === agent.id;
        const nodeColor = isActive ? "#FF9A42" : idx === 0 ? "#A66CFF" : "#36D9F5";
        return (
          <group key={agent.id} position={pos}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectAgent(agent);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverAgent(agent);
              }}
              onPointerOut={() => onHoverAgent(null)}
            >
              <sphereGeometry args={[isActive ? 0.17 : 0.11, 20, 20]} />
              <meshStandardMaterial
                color={nodeColor}
                emissive={nodeColor}
                emissiveIntensity={isActive ? 2.2 : 1.1}
              />
            </mesh>
            <Html distanceFactor={8} position={[0, 0.22, 0]} center>
              <div className="pointer-events-none px-2 py-0.5 rounded bg-[#050914]/85 border border-[#1B2B43] text-[10px] font-medium text-slate-200 whitespace-nowrap">
                {agent.name.replace(" Agent", "")}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export function NeuralGlobe({ agents, activeAgentId, onSelectAgent }: NeuralGlobeProps) {
  const [hovered, setHovered] = useState<AgentDefinition | null>(null);
  const [webglSupported] = useState(() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch {
      return false;
    }
  });

  if (!webglSupported) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl border border-[#1B2B43] bg-[#091326]/70 p-6 text-center">
        <div className="w-36 h-36 rounded-full border-2 border-[#36D9F5]/60 flex items-center justify-center shadow-[0_0_50px_rgba(54,217,245,0.25)] mb-4">
          <span className="text-xs font-mono text-[#36D9F5]">NEURAL CORE</span>
        </div>
        <p className="text-xs text-slate-400">WebGL unavailable; displaying 2D Neural Core fallback.</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0, 5.4], fov: 46 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#36D9F5" />
        <pointLight position={[-5, -4, -3]} intensity={1.0} color="#A66CFF" />
        <NeuralCore
          agents={agents}
          activeAgentId={activeAgentId}
          onSelectAgent={onSelectAgent}
          onHoverAgent={setHovered}
        />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate={false} />
      </Canvas>

      {hovered && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-panel px-3.5 py-2 rounded-xl border-[#36D9F5]/50 pointer-events-none z-10">
          <p className="text-xs font-semibold text-[#36D9F5]">{hovered.name}</p>
          <p className="text-[11px] text-slate-300">{hovered.role}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Click node to inspect agent</p>
        </div>
      )}
    </div>
  );
}
