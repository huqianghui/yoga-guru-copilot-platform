import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit";
}

const variantMap: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl",
  secondary: "bg-gray-200 hover:bg-gray-300 text-gray-700",
  danger: "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg hover:shadow-xl",
  ghost: "bg-white hover:bg-purple-100 text-gray-700 border border-purple-200",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm rounded-lg",
  md: "px-6 py-3 rounded-xl",
  lg: "px-8 py-4 rounded-xl text-lg",
};

export function GradientButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
}: GradientButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-semibold transition-all cursor-pointer",
        variantMap[variant],
        sizeMap[size],
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400 from-gray-400 to-gray-400",
        className
      )}
    >
      {children}
    </button>
  );
}
