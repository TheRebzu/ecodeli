'use client'

import * as React from 'react'
import { useState } from 'react'
import { useTutorialContext } from '@/providers/tutorial-provider'
import { Button } from '@/components/ui/button'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog'
import { RefreshCw } from 'lucide-react'

interface TutorialResetProps {
  buttonText?: string
  confirmText?: string
  cancelText?: string
  title?: string
  description?: string
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function TutorialReset({
  buttonText = "Recommencer le tutoriel",
  confirmText = "Oui, recommencer",
  cancelText = "Annuler",
  title = "Réinitialiser le tutoriel ?",
  description = "Vous allez réinitialiser votre progression dans le tutoriel et recommencer depuis le début. Cette action est irréversible.",
  className = "",
  variant = "outline"
}: TutorialResetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const { startTutorial } = useTutorialContext()
  
  const handleReset = async () => {
    try {
      setIsResetting(true)
      
      // Réinitialiser le localStorage pour les fonctionnalités visitées
      const localStorageKeys = Object.keys(localStorage)
      localStorageKeys.forEach(key => {
        if (key.startsWith('feature-visited-')) {
          localStorage.removeItem(key)
        }
      })
      
      // Lancer le tutoriel depuis le début
      await fetch('/api/client/tutorial/reset', { method: 'POST' })
      startTutorial()
      
      setIsOpen(false)
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du tutoriel:', error)
    } finally {
      setIsResetting(false)
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} className={className} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleReset()
            }}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isResetting ? "Réinitialisation..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 