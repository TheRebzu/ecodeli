import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  showText?: boolean;
}

export function LoadingSpinner({
  className,
  size = "md",
  text = "Chargement...",
  showText = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="text-center space-y-4">
        <div
          className={cn(
            "animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto",
            sizeClasses[size],
          )}
        />
        {showText && <p className="text-muted-foreground text-sm">{text}</p>}
      </div>
    </div>
  );
}
