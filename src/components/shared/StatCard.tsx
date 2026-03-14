import { type LucideIcon } from "lucide-react";

type GradientColor = "purple" | "green" | "amber" | "pink" | "blue";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: GradientColor;
}

const gradientMap: Record<GradientColor, string> = {
  purple: "from-purple-400 to-purple-600",
  green: "from-green-400 to-green-600",
  amber: "from-amber-400 to-amber-600",
  pink: "from-pink-400 to-pink-600",
  blue: "from-blue-400 to-blue-600",
};

export function StatCard({ label, value, icon: Icon, color = "purple" }: StatCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-purple-100/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradientMap[color]} flex items-center justify-center shadow-md`}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
}
