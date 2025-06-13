import { ReactNode } from "react";
import { Package2 } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = <Package2 className="h-12 w-12 text-muted-foreground" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-4">{icon}</div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="pt-4">{action}</div>}
    </div>
  );
}
