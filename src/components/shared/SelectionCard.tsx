import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SelectionColor = "green" | "amber" | "purple" | "blue" | "pink";

interface SelectionCardProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  color?: SelectionColor;
  stats?: { label: string; value: string }[];
  className?: string;
}

const activeMap: Record<SelectionColor, string> = {
  green: "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg",
  amber: "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg",
  purple: "border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg",
  blue: "border-blue-400 bg-gradient-to-br from-blue-50 to-sky-50 shadow-lg",
  pink: "border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-lg",
};

const hoverMap: Record<SelectionColor, string> = {
  green: "hover:border-green-300 hover:shadow-md",
  amber: "hover:border-amber-300 hover:shadow-md",
  purple: "hover:border-purple-300 hover:shadow-md",
  blue: "hover:border-blue-300 hover:shadow-md",
  pink: "hover:border-pink-300 hover:shadow-md",
};

export function SelectionCard({
  active,
  onClick,
  icon,
  title,
  description,
  color = "purple",
  stats,
  className,
}: SelectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-8 rounded-2xl border-2 transition-all text-left w-full cursor-pointer",
        active ? activeMap[color] : `border-purple-200 bg-white/80 ${hoverMap[color]}`,
        className
      )}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
          {stats.map((stat) => (
            <div key={stat.label} className="p-2 rounded-lg bg-white/70">
              <p className="font-medium text-gray-800">{stat.value}</p>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
