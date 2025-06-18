"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { TutorialOverlay } from "./tutorial-overlay";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  BookOpen,
  Target,
  Lightbulb,
  Users,
  Shield,
  Gift
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  component: string;
  order: number;
  isRequired: boolean;
  duration?: number;
  videoUrl?: string;
  actionRequired?: {
    type: "click" | "form" | "navigation" | "wait";
    target?: string;
    data?: Record<string, any>;
  };
}

interface MandatoryTutorialManagerProps {
  children: React.ReactNode;
}

export function MandatoryTutorialManager({ children }: MandatoryTutorialManagerProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isStepCompleted, setIsStepCompleted] = useState(false);

  // Vérifier si le tutoriel doit être affiché
  const {
    data: tutorialCheck,
    isLoading: checkLoading
  } = api.client.tutorial.shouldShow.useQuery(
    undefined,
    { 
      enabled: !!session?.user?.id && session.user.role === "CLIENT",
      refetchOnWindowFocus: false
    }
  );

  // Récupérer les étapes du tutoriel
  const {
    data: tutorialSteps,
    isLoading: stepsLoading
  } = api.client.tutorial.getSteps.useQuery(
    undefined,
    { 
      enabled: tutorialCheck?.shouldShow,
      refetchOnWindowFocus: false
    }
  );

  // Récupérer la progression actuelle
  const {
    data: tutorialProgress,
    refetch: refetchProgress
  } = api.client.tutorial.getProgress.useQuery(
    undefined,
    { 
      enabled: tutorialCheck?.shouldShow,
      refetchOnWindowFocus: false
    }
  );

  // Mutation pour compléter une étape
  const completeStepMutation = api.client.tutorial.completeStep.useMutation({
    onSuccess: (result) => {
      setIsStepCompleted(true);
      
      if (result.isCompleted) {
        toast({
          title: "🎉 Tutoriel terminé !",
          description: "Félicitations ! Vous pouvez maintenant utiliser toutes les fonctionnalités.",
          variant: "default"
        });
        
        // Rafraîchir la page pour débloquer la navigation
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (result.nextStep) {
        setCurrentStepIndex(currentStepIndex + 1);
        setTimeSpent(0);
        setIsStepCompleted(false);
        
        toast({
          title: "Étape terminée",
          description: `Passons à l'étape suivante : ${result.nextStep.title}`,
          variant: "default"
        });
      }
      
      refetchProgress();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de compléter cette étape",
        variant: "destructive"
      });
    }
  });

  // Mutation pour ignorer une étape
  const skipStepMutation = api.client.tutorial.skipStep.useMutation({
    onSuccess: (result) => {
      if (result.nextStep) {
        setCurrentStepIndex(currentStepIndex + 1);
        setTimeSpent(0);
        setIsStepCompleted(false);
      }
      refetchProgress();
    }
  });

  // Timer pour le temps passé
  useEffect(() => {
    if (tutorialCheck?.shouldShow) {
      const timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [tutorialCheck?.shouldShow, currentStepIndex]);

  // Initialiser l'index de l'étape courante
  useEffect(() => {
    if (tutorialProgress && tutorialSteps) {
      const currentStep = tutorialProgress.onboarding.currentStep - 1;
      setCurrentStepIndex(Math.max(0, currentStep));
    }
  }, [tutorialProgress, tutorialSteps]);

  const currentStep = tutorialSteps?.[currentStepIndex];
  const progressPercentage = tutorialProgress ? 
    (tutorialProgress.onboarding.currentStep / tutorialProgress.onboarding.totalSteps) * 100 : 0;

  const handleCompleteStep = () => {
    if (currentStep) {
      completeStepMutation.mutate({
        stepId: currentStep.id,
        timeSpent,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const handleSkipStep = () => {
    if (currentStep && !currentStep.isRequired) {
      skipStepMutation.mutate({
        stepId: currentStep.id,
        reason: "Étape optionnelle ignorée"
      });
    }
  };

  const handleActionRequired = () => {
    if (currentStep?.actionRequired) {
      switch (currentStep.actionRequired.type) {
        case "navigation":
          if (currentStep.actionRequired.target) {
            router.push(currentStep.actionRequired.target);
          }
          break;
        case "click":
          // Simuler un clic ou mettre en évidence l'élément
          const element = document.querySelector(currentStep.actionRequired.target || "");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("tutorial-highlight");
          }
          break;
        default:
          break;
      }
    }
  };

  const renderStepContent = () => {
    if (!currentStep) return null;

    const stepIcons = {
      "WelcomeStep": <Gift className="w-8 h-8 text-blue-600" />,
      "CreateAnnouncementStep": <Target className="w-8 h-8 text-green-600" />,
      "FindServicesStep": <Users className="w-8 h-8 text-purple-600" />,
      "StorageStep": <Shield className="w-8 h-8 text-orange-600" />,
      "PaymentSetupStep": <Shield className="w-8 h-8 text-red-600" />,
      "NotificationsStep": <AlertCircle className="w-8 h-8 text-yellow-600" />,
      "CompletionStep": <CheckCircle className="w-8 h-8 text-green-600" />
    };

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {stepIcons[currentStep.component as keyof typeof stepIcons] || <BookOpen className="w-8 h-8 text-blue-600" />}
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Badge variant="outline">
              Étape {currentStepIndex + 1} sur {tutorialSteps?.length || 0}
            </Badge>
            {currentStep.isRequired && (
              <Badge variant="destructive">Obligatoire</Badge>
            )}
            {currentStep.duration && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                ~{currentStep.duration}s
              </Badge>
            )}
          </div>

          <CardTitle className="text-2xl font-bold">
            {currentStep.title}
          </CardTitle>
          
          <CardDescription className="text-lg">
            {currentStep.description}
          </CardDescription>

          <Progress value={progressPercentage} className="w-full mt-4" />
          <p className="text-sm text-muted-foreground">
            Progression: {Math.round(progressPercentage)}%
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Vidéo si disponible */}
          {currentStep.videoUrl && (
            <div className="aspect-video">
              <video
                src={currentStep.videoUrl}
                controls
                className="w-full h-full rounded-lg"
                poster="/images/tutorial/video-placeholder.jpg"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>
          )}

          {/* Contenu spécifique à l'étape */}
          <div className="text-center space-y-4">
            {currentStep.component === "WelcomeStep" && (
              <div className="space-y-4">
                <Lightbulb className="w-16 h-16 text-yellow-500 mx-auto" />
                <p className="text-lg">
                  Bienvenue dans l'aventure EcoDeli ! Ce tutoriel vous guidera 
                  à travers toutes les fonctionnalités essentielles de notre plateforme.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Conseil :</strong> Prenez votre temps et n'hésitez pas 
                    à explorer chaque fonctionnalité.
                  </p>
                </div>
              </div>
            )}

            {currentStep.component === "CompletionStep" && (
              <div className="space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <p className="text-lg">
                  🎉 Félicitations ! Vous maîtrisez maintenant les bases d'EcoDeli.
                </p>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    Vous pouvez maintenant accéder à toutes les fonctionnalités 
                    de la plateforme. Bon voyage écologique !
                  </p>
                </div>
              </div>
            )}

            {/* Temps passé */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Temps passé: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            {!currentStep.isRequired && (
              <Button
                variant="outline"
                onClick={handleSkipStep}
                disabled={skipStepMutation.isPending}
              >
                Ignorer
              </Button>
            )}

            {currentStep.actionRequired && (
              <Button
                variant="secondary"
                onClick={handleActionRequired}
              >
                <Play className="w-4 h-4 mr-2" />
                {currentStep.actionRequired.type === "navigation" ? "Aller à" : "Essayer"}
              </Button>
            )}

            <Button
              onClick={handleCompleteStep}
              disabled={completeStepMutation.isPending}
              className="min-w-[120px]"
            >
              {completeStepMutation.isPending ? (
                "En cours..."
              ) : currentStep.component === "CompletionStep" ? (
                "Terminer"
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Ne rien afficher si pas client ou pas besoin de tutoriel
  if (status === "loading" || checkLoading || stepsLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Chargement...</div>
    </div>;
  }

  if (session?.user?.role !== "CLIENT" || !tutorialCheck?.shouldShow) {
    return <>{children}</>;
  }

  // Afficher le tutoriel en overlay bloquant
  return (
    <TutorialOverlay
      isActive={true}
      isBlocking={true}
      allowEscape={false}
      showProgress={true}
      currentStep={currentStepIndex + 1}
      totalSteps={tutorialSteps?.length || 0}
      title="Tutoriel d'introduction - EcoDeli"
      isMission1={true}
      showTimer={true}
      estimatedTime={currentStep?.duration}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        {renderStepContent()}
      </div>
    </TutorialOverlay>
  );
}