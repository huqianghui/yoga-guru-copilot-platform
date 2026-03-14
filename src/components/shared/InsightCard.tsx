import { type LucideIcon } from "lucide-react";

type InsightColor = "purple" | "green" | "amber" | "blue" | "pink" | "red";

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: InsightColor;
}

const bgMap: Record<InsightColor, string> = {
  purple: "from-purple-100/70 to-purple-50/70",
  green: "from-green-100/70 to-green-50/70",
  amber: "from-amber-100/70 to-amber-50/70",
  blue: "from-blue-100/70 to-blue-50/70",
  pink: "from-pink-100/70 to-pink-50/70",
  red: "from-red-100/70 to-red-50/70",
};

const iconColorMap: Record<InsightColor, string> = {
  purple: "text-purple-600",
  green: "text-green-600",
  amber: "text-amber-600",
  blue: "text-blue-600",
  pink: "text-pink-600",
  red: "text-red-600",
};

export function InsightCard({ icon: Icon, title, description, color = "purple" }: InsightCardProps) {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${bgMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${iconColorMap[color]}`} />
        <p className="font-medium text-gray-800">{title}</p>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
