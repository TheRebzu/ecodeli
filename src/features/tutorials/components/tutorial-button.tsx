'use client'

import { Button } from '@/components/ui/button'
import { BookOpen, RotateCcw } from 'lucide-react'
import { useTutorial } from '../hooks/useTutorial'

interface TutorialButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showRestart?: boolean
  className?: string
}

export function TutorialButton({ 
  variant = 'outline', 
  size = 'sm',
  showRestart = false,
  className
}: TutorialButtonProps) {
  const { 
    tutorialState, 
    openTutorial, 
    resetTutorial, 
    loading 
  } = useTutorial()

  if (loading || !tutorialState) {
    return null
  }

  // Si le tutoriel n'est pas encore terminé
  if (!tutorialState.progress?.isCompleted) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={openTutorial}
        className={className}
        disabled={loading}
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Reprendre le tutoriel
      </Button>
    )
  }

  // Si le tutoriel est terminé
  return (
    <div className="flex gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={openTutorial}
        className={className}
        disabled={loading}
      >
        <BookOpen className="w-4 h-4 mr-2" />
        Revoir le tutoriel
      </Button>
      
      {showRestart && (
        <Button
          variant="ghost"
          size={size}
          onClick={resetTutorial}
          className="text-gray-500 hover:text-gray-700"
          disabled={loading}
          title="Réinitialiser le tutoriel"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}