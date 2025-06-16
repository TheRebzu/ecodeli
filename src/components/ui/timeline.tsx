"use client";

import * as React from "react";
import { cn } from "@/lib/utils/common";

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative ml-3 space-y-0 pt-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Timeline.displayName = "Timeline";

interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  active?: boolean;
  success?: boolean;
  error?: boolean;
  pending?: boolean;
  icon?: React.ReactNode;
  date?: string | Date;
  dateFormat?: "relative" | "absolute";
}

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  (
    {
      className,
      children,
      active,
      success,
      error,
      pending,
      icon,
      date,
      dateFormat = "absolute",
      ...props
    },
    ref,
  ) => {
    const getStatusColor = () => {
      if (active) return "bg-primary border-primary";
      if (success) return "bg-green-500 border-green-500";
      if (error) return "bg-destructive border-destructive";
      if (pending) return "bg-yellow-500 border-yellow-500";
      return "bg-muted border-muted";
    };

    const formatDate = (date: string | Date): string => {
      if (!date) return "";

      const dateObj = typeof date === "string" ? new Date(date) : date;

      if (dateFormat === "relative") {
        const now = new Date();
        const diff = now.getTime() - dateObj.getTime();

        // Less than a minute
        if (diff < 60 * 1000) return "Just now";

        // Less than an hour
        if (diff < 60 * 60 * 1000) {
          const minutes = Math.floor(diff / (60 * 1000));
          return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        }

        // Less than a day
        if (diff < 24 * 60 * 60 * 1000) {
          const hours = Math.floor(diff / (60 * 60 * 1000));
          return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        }

        // Less than a week
        if (diff < 7 * 24 * 60 * 60 * 1000) {
          const days = Math.floor(diff / (24 * 60 * 60 * 1000));
          return `${days} day${days !== 1 ? "s" : ""} ago`;
        }
      }

      return dateObj.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"});
    };

    return (
      <div ref={ref} className={cn("relative pb-8", className)} {...props}>
        {/* Line connector */}
        <div className="absolute left-[-12px] top-1 bottom-0 w-px bg-border" />

        {/* Circle marker */}
        <div
          className={cn(
            "absolute left-[-16px] top-1 h-4 w-4 rounded-full border-2",
            getStatusColor(),
          )}
        >
          {icon && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-background">
              {icon}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-1">
          {date && (
            <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    );
  },
);
TimelineItem.displayName = "TimelineItem";

// Composants additionnels pour compatibilité
interface TimelineDotProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  success?: boolean;
  error?: boolean;
  pending?: boolean;
  icon?: React.ReactNode;
}

export const TimelineDot = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, active, success, error, pending, icon, ...props }, ref) => {
    const getStatusColor = () => {
      if (active) return "bg-primary border-primary";
      if (success) return "bg-green-500 border-green-500";
      if (error) return "bg-destructive border-destructive";
      if (pending) return "bg-yellow-500 border-yellow-500";
      return "bg-muted border-muted";
    };

    return (
      <div
        ref={ref}
        className={cn(
          "h-4 w-4 rounded-full border-2",
          getStatusColor(),
          className,
        )}
        {...props}
      >
        {icon && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-background">
            {icon}
          </div>
        )}
      </div>
    );
  },
);
TimelineDot.displayName = "TimelineDot";

interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {}

export const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  TimelineConnectorProps
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("w-px bg-border", className)} {...props} />
  );
});
TimelineConnector.displayName = "TimelineConnector";

interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const TimelineContent = React.forwardRef<
  HTMLDivElement,
  TimelineContentProps
>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("text-sm", className)} {...props}>
      {children}
    </div>
  );
});
TimelineContent.displayName = "TimelineContent";

// Alias pour compatibilité
export const TimelineSeparator = TimelineConnector;

export { Timeline as Root, TimelineItem as Item };
