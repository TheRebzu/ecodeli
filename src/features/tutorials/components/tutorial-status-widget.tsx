'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BookOpen, CheckCircle, Clock, Star } from 'lucide-react'
import { useTutorial } from '../hooks/useTutorial'

export function TutorialStatusWidget() {
  const { tutorialState, openTutorial, loading } = useTutorial()

  if (loading || !tutorialState) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Tutoriel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progress = tutorialState.progress
  const isCompleted = progress?.isCompleted || false

  if (isCompleted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            Tutoriel terminé !
          </CardTitle>
          <CardDescription className="text-green-600">
            Félicitations ! Vous maîtrisez maintenant EcoDeli.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Temps de completion:</span>
              <span className="font-medium">
                {Math.round((progress?.totalTimeSpent || 0) / 60)}min
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Étapes complétées:</span>
              <Badge variant="outline" className="bg-green-100">
                {progress?.completedSteps}/{progress?.totalSteps}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openTutorial}
              className="w-full mt-3"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Revoir le tutoriel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Tutoriel en cours ou non démarré
  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Tutoriel EcoDeli
        </CardTitle>
        <CardDescription>
          {tutorialState.tutorialRequired 
            ? 'Terminez le tutoriel pour débloquer toutes les fonctionnalités'
            : 'Découvrez toutes les fonctionnalités de la plateforme'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Barre de progression */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progression</span>
              <span className="font-medium">{progress?.progressPercentage || 0}%</span>
            </div>
            <Progress value={progress?.progressPercentage || 0} className="h-2" />
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{progress?.completedSteps || 0}/{progress?.totalSteps || 5} étapes</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-400" />
              <span>{progress?.completedMandatory || 0}/{progress?.mandatorySteps || 4} obligatoires</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={openTutorial}
              className="flex-1"
              size="sm"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {progress?.completedSteps ? 'Continuer' : 'Commencer'}
            </Button>
          </div>

          {tutorialState.tutorialRequired && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
              <p className="text-xs text-orange-800">
                ⚠️ Le tutoriel est obligatoire pour accéder à toutes les fonctionnalités
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}