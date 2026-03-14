import { cn } from "@/lib/utils";

type BadgeVariant = "success" | "warning" | "info" | "gradient" | "purple" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
  gradient: "bg-gradient-to-r from-purple-200 to-green-200 text-gray-700",
  purple: "bg-purple-100/70 text-purple-700",
  outline: "bg-white border border-purple-200 text-gray-700",
};

export function Badge({ children, variant = "success", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
        variantMap[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
