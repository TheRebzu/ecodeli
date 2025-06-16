import { ReactNode } from "react";
import { cn } from "@/lib/utils/common";

interface PageHeadingProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function PageHeading({
  title,
  description,
  icon,
  className,
  actions}: PageHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 text-primary">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
