import { type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { IconBox } from "./IconBox";

type ActionColor = "purple" | "green" | "amber" | "pink" | "blue" | "indigo";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color?: ActionColor;
}

export function QuickActionCard({ title, description, icon, path, color = "purple" }: QuickActionCardProps) {
  return (
    <Link
      to={path}
      className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-purple-100/50 hover:-translate-y-1"
    >
      <IconBox
        icon={icon}
        size="md"
        color={color}
        className="mb-4 group-hover:scale-110 transition-transform"
      />
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
