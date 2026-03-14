import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type InfoBoxVariant = "tip" | "success" | "warning" | "info";

interface InfoBoxProps {
  children: ReactNode;
  icon?: ReactNode;
  title?: string;
  variant?: InfoBoxVariant;
  className?: string;
}

const variantMap: Record<InfoBoxVariant, string> = {
  tip: "from-purple-100/70 to-green-100/70 border-purple-200/50",
  success: "from-green-100/70 to-emerald-100/70 border-green-200/50",
  warning: "from-amber-100/70 to-orange-100/70 border-amber-200/50",
  info: "from-blue-50/70 to-indigo-50/70 border-blue-200/50",
};

export function InfoBox({ children, icon, title, variant = "tip", className }: InfoBoxProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 bg-gradient-to-br border",
        variantMap[variant],
        className
      )}
    >
      {(icon || title) && (
        <div className="flex items-center gap-2 mb-2">
          {icon}
          {title && <p className="font-semibold text-gray-800">{title}</p>}
        </div>
      )}
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
