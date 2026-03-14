import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ListItemProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  rightContent?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  icon,
  title,
  subtitle,
  badge,
  rightContent,
  onClick,
  className,
}: ListItemProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50/50 to-green-50/50 hover:from-purple-100/50 hover:to-green-100/50 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">{title}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {badge && <div>{badge}</div>}
      {rightContent && <div>{rightContent}</div>}
    </div>
  );
}
