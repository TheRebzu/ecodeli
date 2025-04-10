'use client'

import { useTutorialContext } from "@/providers/tutorial-provider"
import { Progress } from "@/components/ui/progress"

export function TutorialProgress() {
  const { steps, currentStep, progress } = useTutorialContext()
  
  if (!progress || !currentStep || !steps.length) return null
  
  const currentIndex = steps.findIndex(s => s.id === currentStep.id)
  const progressPercentage = currentIndex >= 0 
    ? Math.round(((currentIndex + 1) / steps.length) * 100)
    : 0
  
  return (
    <div className="w-full">
      <Progress value={progressPercentage} className="h-1" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>Étape {currentIndex + 1} / {steps.length}</span>
        <span>{progressPercentage}% complété</span>
      </div>
    </div>
  )
} 