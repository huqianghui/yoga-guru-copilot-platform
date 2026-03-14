import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function GlassCard({
  children,
  className,
  padding = "md",
  hover = false,
  gradient = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50",
        paddingMap[padding],
        hover && "hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer",
        gradient && "bg-gradient-to-r from-purple-50/50 to-green-50/50",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
