import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress?: number;
  animated?: boolean;
  label?: string;
  className?: string;
}

export function ProgressBar({ progress, animated = false, label, className }: ProgressBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full bg-gradient-to-r from-purple-500 to-green-500 rounded-full transition-all duration-500",
            animated && "animate-pulse"
          )}
          style={{ width: progress !== undefined ? `${progress}%` : "75%" }}
        />
      </div>
      {label && <p className="text-sm text-gray-600 text-center">{label}</p>}
    </div>
  );
}
