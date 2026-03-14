import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
  rightContent?: ReactNode;
}

export function PageHeader({ title, description, action, rightContent }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>
      {action && <div>{action}</div>}
      {rightContent && <div className="text-right">{rightContent}</div>}
    </div>
  );
}
