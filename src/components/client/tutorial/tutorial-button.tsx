'use client'

import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTutorialContext } from '@/context/tutorial-data-provider'

interface TutorialButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left'
  label?: string
}

export function TutorialButton({
  variant = 'ghost',
  size = 'icon',
  tooltipPosition = 'bottom',
  label = 'Aide & Tutoriel'
}: TutorialButtonProps) {
  const { startTutorial, isActive } = useTutorialContext()
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={() => startTutorial()}
            disabled={isActive}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
            aria-label={label}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipPosition}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 