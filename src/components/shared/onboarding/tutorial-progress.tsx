"use client";

import React from "react";
import { cn } from "@/lib/utils/common";

type TutorialProgressProps = {
  currentStep: number;
  totalSteps: number;
  className?: string;
};

export function TutorialProgress({
  currentStep,
  totalSteps,
  className}: TutorialProgressProps) {
  return (
    <div className={cn("flex space-x-2 justify-center w-full my-4", className)}>
      {Array.from({ length  }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "transition-all h-2 rounded-full",
            index === currentStep
              ? "w-8 bg-primary"
              : index < currentStep
                ? "w-4 bg-primary/60"
                : "w-2 bg-muted",
          )}
        />
      ))}
    </div>
  );
}
