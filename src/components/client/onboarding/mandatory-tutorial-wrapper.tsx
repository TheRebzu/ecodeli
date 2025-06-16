"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Lock, 
  CheckCircle, 
  Star,
  AlertTriangle 
} from "lucide-react";
import { ClientTutorial } from "@/components/client/tutorial/client-tutorial";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";

interface MandatoryTutorialWrapperProps {
  children: React.ReactNode;
  requireMission1?: boolean;
}

/**
 * Wrapper qui bloque l'accès à l'application jusqu'à 
 * ce que l'utilisateur complète le tutoriel Mission 1
 */
export function MandatoryTutorialWrapper({ 
  children, 
  requireMission1 = true 
}: MandatoryTutorialWrapperProps) {
  const { data } = useSession();
  const { toast } = useToast();
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Vérifier si l'utilisateur a complété Mission 1
  const { data: tutorialStatus, isLoading, refetch } = 
    api.clientTutorial.getTutorialStatus.useQuery(undefined, {
      enabled: !!session?.user,
    });

  // Mutation pour marquer le tutoriel comme complété
  const completeTutorialMutation = api.clientTutorial.completeTutorial.useMutation({ onSuccess: () => {
      setTutorialCompleted(true);
      setShowTutorial(false);
      toast({
        title: "Mission 1 accomplie !",
        description: "Félicitations ! Vous avez maintenant accès à toutes les fonctionnalités.",
       });
      refetch();
    },
    onError: (error) => {
      toast({ title: "Erreur",
        description: error.message,
        variant: "destructive",
       });
      setIsCompleting(false);
    },
  });

  useEffect(() => {
    if (!isLoading && tutorialStatus && requireMission1) {
      const hasCompletedMission1 = tutorialStatus.mission1Completed;
      
      if (!hasCompletedMission1) {
        // Afficher immédiatement le tutoriel si Mission 1 n'est pas complétée
        setShowTutorial(true);
      } else {
        setTutorialCompleted(true);
      }
    }
  }, [tutorialStatus, isLoading, requireMission1]);

  const handleCompleteTutorial = async () => {
    setIsCompleting(true);
    try {
      await completeTutorialMutation.mutateAsync({ tutorialType: "MISSION_1",
        completedSteps: 10, // Nombre total d'étapes Mission 1
       });
    } catch (error) {
      console.error("Erreur lors de la completion du tutoriel:", error);
      setIsCompleting(false);
    }
  };

  const handleStartTutorial = () => {
    setShowTutorial(true);
  };

  // Écran de chargement
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Vérification de votre progression...</p>
        </div>
      </div>
    );
  }

  // Si Mission 1 n'est pas requis ou est complété, afficher l'app normalement
  if (!requireMission1 || tutorialCompleted || tutorialStatus?.mission1Completed) {
    return <>{children}</>;
  }

  // Interface bloquée avec tutoriel obligatoire
  return (
    <>
      {/* Overlay de blocage */}
      <div className="fixed inset-0 bg-background z-40">
        <div className="container mx-auto px-4 py-8 h-full flex items-center justify-center">
          <div className="max-w-2xl w-full space-y-6 text-center">
            {/* En-tête */}
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              
              <h1 className="text-3xl font-bold tracking-tight">
                Mission 1 : Découverte d'EcoDeli
              </h1>
              
              <p className="text-lg text-muted-foreground">
                Avant de commencer votre aventure écologique, découvrez les fonctionnalités 
                essentielles de notre plateforme dans ce tutoriel interactif obligatoire.
              </p>
            </div>

            {/* Avantages du tutoriel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <CheckCircle className="h-5 w-5 text-blue-600 mb-2" />
                <h3 className="font-medium text-blue-900">Maîtrisez la plateforme</h3>
                <p className="text-sm text-blue-700">
                  Apprenez toutes les fonctionnalités pour une expérience optimale
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <Star className="h-5 w-5 text-green-600 mb-2" />
                <h3 className="font-medium text-green-900">Débloquez les avantages</h3>
                <p className="text-sm text-green-700">
                  Accédez au programme EcoWarrior et aux récompenses
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <Lock className="h-5 w-5 text-purple-600 mb-2" />
                <h3 className="font-medium text-purple-900">Sécurité garantie</h3>
                <p className="text-sm text-purple-700">
                  Comprenez nos mesures de protection et de paiement
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mb-2" />
                <h3 className="font-medium text-yellow-900">Impact environnemental</h3>
                <p className="text-sm text-yellow-700">
                  Découvrez votre contribution à la planète
                </p>
              </div>
            </div>

            {/* Progress si en cours */}
            {tutorialStatus?.mission1Progress && tutorialStatus.mission1Progress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progression de Mission 1</span>
                  <span>{tutorialStatus.mission1Progress}/10 étapes</span>
                </div>
                <Progress 
                  value={(tutorialStatus.mission1Progress / 10) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                size="lg" 
                onClick={handleStartTutorial}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                {tutorialStatus?.mission1Progress > 0 ? "Continuer Mission 1" : "Commencer Mission 1"}
              </Button>
            </div>

            {/* Note importante */}
            <Alert className="text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Mission 1 est obligatoire</strong> pour tous les nouveaux utilisateurs. 
                Cette formation courte (5-10 minutes) vous donne les clés pour profiter 
                pleinement de l'écosystème EcoDeli.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Dialog du tutoriel */}
      <Dialog open={showTutorial} onOpenChange={() => {}}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-hidden"
          hideCloseButton={true}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Mission 1 - Tutoriel EcoDeli</DialogTitle>
            <DialogDescription>
              Tutoriel obligatoire pour découvrir les fonctionnalités essentielles
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <ClientTutorial 
              isMission1={true}
              options={{
                onComplete: handleCompleteTutorial,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook pour vérifier si l'utilisateur a complété Mission 1
 */
export function useMission1Status() {
  const { data: tutorialStatus, isLoading } = 
    api.clientTutorial.getTutorialStatus.useQuery();

  return {
    isCompleted: tutorialStatus?.mission1Completed || false,
    progress: tutorialStatus?.mission1Progress || 0,
    isLoading,
  };
}

/**
 * Composant bouton pour relancer le tutoriel
 */
export function TutorialReplayer() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setShowTutorial(true)}
        className="flex items-center gap-2"
      >
        <BookOpen className="h-4 w-4" />
        Revoir Mission 1
      </Button>

      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Mission 1 - Révision</DialogTitle>
            <DialogDescription>
              Révisez les fonctionnalités essentielles d'EcoDeli
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <ClientTutorial 
              isMission1={true}
              options={{
                onComplete: async () => {
                  setShowTutorial(false);
                },
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}