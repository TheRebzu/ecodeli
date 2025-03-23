import * as React from "react";
import { cn } from "@/lib/utils";

const Timeline = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
Timeline.displayName = "Timeline";

const TimelineItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative pl-8 pb-4 last:pb-0", className)}
    {...props}
  />
));
TimelineItem.displayName = "TimelineItem";

const TimelineIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-primary",
      className
    )}
    {...props}
  />
));
TimelineIcon.displayName = "TimelineIcon";

const TimelineHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-2 text-sm", className)}
    {...props}
  />
));
TimelineHeader.displayName = "TimelineHeader";

const TimelineTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("font-medium", className)}
    {...props}
  />
));
TimelineTitle.displayName = "TimelineTitle";

const TimelineContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-1 text-sm", className)}
    {...props}
  />
));
TimelineContent.displayName = "TimelineContent";

const TimelineBody = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("leading-relaxed", className)}
    {...props}
  />
));
TimelineBody.displayName = "TimelineBody";

const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute left-3 top-6 bottom-0 -translate-x-1/2 w-[2px] bg-border",
      className
    )}
    {...props}
  />
));
TimelineConnector.displayName = "TimelineConnector";

export {
  Timeline,
  TimelineItem,
  TimelineIcon,
  TimelineHeader,
  TimelineTitle,
  TimelineContent,
  TimelineBody,
  TimelineConnector,
}; 