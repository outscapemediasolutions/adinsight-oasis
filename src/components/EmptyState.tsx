
import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center h-[70vh] py-10",
        className
      )}
    >
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-white/60 max-w-md">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default EmptyState;
