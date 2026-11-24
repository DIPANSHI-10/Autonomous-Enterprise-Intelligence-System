import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../../store/useAppStore";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverGlow?: boolean;
  delay?: number;
}

export function GlassCard({ children, className = "", hoverGlow = false, delay = 0 }: GlassCardProps) {
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  if (reducedMotion) {
    return (
      <div className={`glass-panel rounded-xl ${hoverGlow ? "glass-panel-hover" : ""} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`glass-panel rounded-xl transition-all duration-200 ${
        hoverGlow ? "glass-panel-hover" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
