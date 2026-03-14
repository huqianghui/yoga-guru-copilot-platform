import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconBoxSize = "sm" | "md" | "lg";
type IconBoxColor = "purple" | "green" | "amber" | "pink" | "blue" | "indigo" | "red" | "brand";

interface IconBoxProps {
  icon: LucideIcon;
  size?: IconBoxSize;
  color?: IconBoxColor;
  className?: string;
}

const sizeMap: Record<IconBoxSize, { box: string; icon: string }> = {
  sm: { box: "w-8 h-8 rounded-lg", icon: "w-4 h-4" },
  md: { box: "w-10 h-10 rounded-lg", icon: "w-5 h-5" },
  lg: { box: "w-14 h-14 rounded-xl", icon: "w-7 h-7" },
};

const colorMap: Record<IconBoxColor, string> = {
  purple: "from-purple-400 to-purple-600",
  green: "from-green-400 to-green-600",
  amber: "from-amber-400 to-amber-600",
  pink: "from-pink-400 to-pink-600",
  blue: "from-blue-400 to-blue-600",
  indigo: "from-indigo-400 to-indigo-600",
  red: "from-red-400 to-red-600",
  brand: "from-purple-400 to-green-400",
};

export function IconBox({ icon: Icon, size = "md", color = "brand", className }: IconBoxProps) {
  return (
    <div
      className={cn(
        `bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-md`,
        sizeMap[size].box,
        className
      )}
    >
      <Icon className={cn(sizeMap[size].icon, "text-white")} />
    </div>
  );
}
