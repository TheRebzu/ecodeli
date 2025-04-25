import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  fluid?: boolean;
}

export function Container({
  children,
  fluid = false,
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        fluid ? "px-4" : "max-w-screen-xl px-4 md:px-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
