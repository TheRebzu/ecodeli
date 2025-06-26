"use client"

import { DashboardLayout } from '@/components/layout/core/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { type NavigationItem } from '@/components/layout/types/layout.types'
import { useState, useEffect } from 'react'
import { ClientTutorialOverlay } from '@/features/tutorials/components/client-tutorial-overlay'
import { useClientTutorial } from '@/features/client/hooks/useClientData'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Tutorial state
  const {
    tutorial,
    loading: tutorialLoading,
    error: tutorialError,
    updateTutorialStep,
    completeTutorial
  } = useClientTutorial()
  
  const [showTutorial, setShowTutorial] = useState(false)
  
  console.log('🔍 [ClientLayout] Auth state:', { user, isLoading, isAuthenticated })

  // Check if tutorial is required on component mount
  useEffect(() => {
    if (user && tutorial && !tutorialLoading) {
      // Show tutorial if user hasn't completed it yet
      setShowTutorial(!tutorial.completed)
    }
  }, [user, tutorial, tutorialLoading])

  // Navigation client
  const navigationItems: NavigationItem[] = [
    {
      key: 'dashboard',
      label: 'Tableau de bord',
      href: '/client',
      icon: 'LayoutDashboard',
      category: 'main'
    },
    {
      key: 'announcements',
      label: 'Mes annonces',
      href: '/client/announcements',
      icon: 'FileText',
      category: 'main'
    },
    {
      key: 'deliveries',
      label: 'Mes livraisons',
      href: '/client/deliveries',
      icon: 'Truck',
      category: 'main'
    },
    {
      key: 'services',
      label: 'Services',
      href: '/client/services',
      icon: 'Briefcase',
      category: 'main'
    },
    {
      key: 'storage',
      label: 'Stockage',
      href: '/client/storage',
      icon: 'Package',
      category: 'main'
    },
    {
      key: 'subscription',
      label: 'Mon abonnement',
      href: '/client/subscription',
      icon: 'Crown',
      category: 'account'
    },
    {
      key: 'settings',
      label: 'Paramètres',
      href: '/client/settings',
      icon: 'Settings',
      category: 'account'
    }
  ]

  // Actions rapides pour les clients
  const quickActions = [
    {
      key: 'new-announcement',
      label: 'Nouvelle annonce',
      icon: 'Plus',
      href: '/client/announcements/create',
      variant: 'primary' as const
    },
    {
      key: 'track-delivery',
      label: 'Suivi livraison',
      icon: 'MapPin',
      href: '/client/tracking'
    }
  ]

  // Notifications mockées (remplacer par vraies notifications)
  const notifications = [
    {
      id: '1',
      title: 'Livraison en cours',
      message: 'Votre commande sera livrée dans 30 minutes',
      type: 'info' as const,
      timestamp: new Date(),
      read: false,
      actionUrl: '/client/tracking'
    }
  ]

  // Tutorial handlers
  const handleStepComplete = async (stepId: number, timeSpent: number) => {
    try {
      await updateTutorialStep(stepId.toString(), true)
    } catch (error) {
      console.error('Error completing tutorial step:', error)
    }
  }

  const handleTutorialComplete = async (data: {
    totalTimeSpent: number
    stepsCompleted: number[]
    feedback?: string
    rating?: number
  }) => {
    try {
      await completeTutorial()
      setShowTutorial(false)
    } catch (error) {
      console.error('Error completing tutorial:', error)
    }
  }

  // Tutorial steps definition
  const tutorialSteps = [
    {
      id: 1,
      title: 'Bienvenue sur EcoDeli',
      description: 'Découvrez la plateforme éco-responsable qui révolutionne la livraison',
      type: 'welcome',
      mandatory: true,
      estimatedTime: 30,
      completed: tutorial?.progress?.welcome || false,
      timeSpent: 0,
      skipped: false
    },
    {
      id: 2,
      title: 'Votre profil',
      description: 'Complétez votre profil pour optimiser votre expérience',
      type: 'profile',
      mandatory: true,
      estimatedTime: 45,
      completed: tutorial?.progress?.profile || false,
      timeSpent: 0,
      skipped: false
    },
    {
      id: 3,
      title: 'Abonnements EcoDeli',
      description: 'Découvrez nos plans tarifaires et leurs avantages',
      type: 'subscription',
      mandatory: true,
      estimatedTime: 60,
      completed: tutorial?.progress?.subscription || false,
      timeSpent: 0,
      skipped: false
    },
    {
      id: 4,
      title: 'Créer une annonce',
      description: 'Apprenez à publier votre première demande de livraison',
      type: 'announcement',
      mandatory: true,
      estimatedTime: 90,
      completed: tutorial?.progress?.announcement || false,
      timeSpent: 0,
      skipped: false
    },
    {
      id: 5,
      title: 'Félicitations !',
      description: 'Vous êtes maintenant prêt à utiliser EcoDeli',
      type: 'completion',
      mandatory: true,
      estimatedTime: 15,
      completed: tutorial?.progress?.completion || false,
      timeSpent: 0,
      skipped: false
    }
  ]

  const currentStep = tutorialSteps.find(step => !step.completed)?.id || 1
  const completedSteps = tutorialSteps.filter(step => step.completed).length
  const progressPercentage = Math.round((completedSteps / tutorialSteps.length) * 100)

  // Redirection si pas authentifié
  if (!isAuthenticated && !isLoading) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  // État de chargement
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <DashboardLayout
        role="CLIENT"
        user={user}
        navigationItems={navigationItems}
        quickActions={quickActions}
        notifications={notifications}
        showBreadcrumbs={true}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {children}
      </DashboardLayout>

      {/* Tutorial Overlay - MANDATORY for first connection */}
      {user && !tutorialLoading && (
        <ClientTutorialOverlay
          isOpen={showTutorial}
          tutorialRequired={!tutorial?.completed}
          currentStep={currentStep}
          steps={tutorialSteps}
          settings={{
            blockingOverlay: true, // BLOCK all interactions until completion
            allowSkip: false, // MANDATORY completion
            autoSave: true,
            showProgress: true
          }}
          progressPercentage={progressPercentage}
          user={{
            name: user.name || user.email,
            email: user.email,
            subscriptionPlan: user.profileData?.subscriptionPlan || 'FREE'
          }}
          onStepComplete={handleStepComplete}
          onTutorialComplete={handleTutorialComplete}
          onClose={tutorial?.completed ? () => setShowTutorial(false) : undefined}
        />
      )}
    </>
  )
}