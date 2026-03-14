import { type ReactNode } from "react";

interface SectionTitleProps {
  children: ReactNode;
  action?: ReactNode;
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{children}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
