'use client';

import { useEffect, useState } from 'react';
import { useOnboarding } from '@/context/onboarding-context';
import { TutorialStep } from '../tutorial-step';
import { TutorialProgress } from '../tutorial-progress';
import { TutorialNavigation } from '../tutorial-navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Star, MapPin, Package, Truck, Leaf, Shield } from 'lucide-react';

// Labels pour les boutons de navigation du tutoriel
const navigationLabels = {
  skip: 'Passer le tutoriel',
  previous: 'Précédent',
  next: 'Suivant',
  finish: 'Terminer Mission 1',
};

// Définition complète des étapes du tutoriel client Mission 1
const CLIENT_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: '🌱 Bienvenue chez EcoDeli - Mission 1',
    description: 'Commençons votre aventure écologique ! Ce tutoriel obligatoire vous guide à travers les fonctionnalités essentielles de notre plateforme de livraison durable.',
    image: '/images/onboarding/client/welcome.png',
    isMission1: true,
    isRequired: true,
    content: {
      intro: 'EcoDeli révolutionne la livraison urbaine en privilégiant les moyens de transport écologiques et les pratiques durables.',
      objectives: [
        'Découvrir le concept de livraison écologique',
        'Apprendre à utiliser la plateforme efficacement', 
        'Comprendre notre écosystème de services',
        'Maîtriser les bonnes pratiques environnementales'
      ]
    }
  },
  {
    id: 'ecodeli-concept',
    title: '🌍 Le concept EcoDeli',
    description: 'EcoDeli révolutionne la livraison en privilégiant les moyens de transport écologiques : vélos, trottinettes électriques, marche à pied, et transports en commun.',
    image: '/images/onboarding/client/concept.png',
    content: {
      highlights: [
        '🚴‍♂️ Livraisons à vélo et moyens durables',
        '📦 Emballages réutilisables et consignés',
        '🌱 Réduction de l\'empreinte carbone',
        '💚 Contribution à l\'économie circulaire'
      ],
      impact: {
        co2Reduction: '75% de CO2 en moins',
        packaging: '90% d\'emballages réutilisés',
        localJobs: '500+ emplois locaux créés'
      }
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'dashboard-overview',
    title: '📊 Votre tableau de bord',
    description: "Le tableau de bord est votre centre de contrôle. Vous y retrouvez toutes vos informations importantes en un coup d'œil.",
    image: '/images/onboarding/client/dashboard.png',
    content: {
      features: [
        {
          title: 'Statistiques personnelles',
          description: 'Suivez vos livraisons, économies CO2, et points fidélité',
          icon: '📈'
        },
        {
          title: 'Activité récente',
          description: 'Historique de vos dernières commandes et livraisons',
          icon: '📋'
        },
        {
          title: 'Actions rapides',
          description: 'Créer une annonce, réserver un service, accéder au stockage',
          icon: '⚡'
        }
      ]
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'create-announcement',
    title: '📢 Créer votre première annonce',
    description: 'Les annonces sont le cœur du système EcoDeli. Apprenez à créer une demande de livraison efficace.',
    image: '/images/onboarding/client/announcements.png',
    content: {
      steps: [
        '1. Définissez les points de collecte et livraison',
        '2. Choisissez le type de transport souhaité',
        '3. Indiquez les caractéristiques de votre colis',
        '4. Fixez votre budget et délais',
        '5. Publiez et attendez les propositions'
      ],
      tips: [
        '💡 Soyez précis dans vos descriptions',
        '⏰ Planifiez à l\'avance pour de meilleurs tarifs',
        '🏷️ Utilisez des tags pour faciliter la recherche'
      ]
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'delivery-tracking',
    title: '📦 Suivi en temps réel',
    description: "Une fois votre annonce acceptée, suivez votre livraison en temps réel avec notre système de tracking avancé.",
    image: '/images/onboarding/client/deliveries.png',
    content: {
      features: [
        {
          title: 'Géolocalisation temps réel',
          description: 'Suivez votre livreur sur la carte',
          icon: '🗺️'
        },
        {
          title: 'Notifications automatiques',
          description: 'Soyez alerté des étapes importantes',
          icon: '🔔'
        },
        {
          title: 'Code de récupération',
          description: 'Système sécurisé pour la remise du colis',
          icon: '🔐'
        },
        {
          title: 'Évaluation du service',
          description: 'Notez votre expérience après livraison',
          icon: '⭐'
        }
      ]
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'services-ecosystem',
    title: '🛍️ L\'écosystème de services',
    description: 'Au-delà de la livraison, découvrez nos services partenaires : réparation, nettoyage écologique, courses responsables...',
    image: '/images/onboarding/client/services.png',
    content: {
      categories: [
        {
          title: '🔧 Services de réparation',
          description: 'Réparez au lieu de jeter',
          examples: ['Réparation électronique', 'Couture et retouches', 'Réparation vélo']
        },
        {
          title: '🧽 Nettoyage écologique',
          description: 'Services d\'entretien responsables',
          examples: ['Produits biodégradables', 'Techniques économes en eau', 'Équipes locales']
        },
        {
          title: '🛒 Courses responsables',
          description: 'Approvisionnement local et bio',
          examples: ['Producteurs locaux', 'Produits de saison', 'Zero déchet']
        },
        {
          title: '♻️ Services de recyclage',
          description: 'Gestion des déchets optimisée',
          examples: ['Tri sélectif', 'Compostage', 'Valorisation']
        }
      ]
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'storage-system',
    title: '📦 Système de stockage intelligent',
    description: 'Notre réseau de consignes et d\'emballages réutilisables révolutionne la logistique urbaine.',
    image: '/images/onboarding/client/storage.png',
    content: {
      benefits: [
        '📍 Réseau de points de collecte dans votre ville',
        '♻️ Emballages consignés et réutilisables',
        '⏰ Disponibilité 24h/7j pour plus de flexibilité',
        '💰 Économies sur les frais d\'emballage',
        '🌱 Impact environnemental réduit'
      ],
      howItWorks: [
        '1. Réservez une boîte de la taille adaptée',
        '2. Déposez votre colis dans un point relais',
        '3. Le livreur récupère et livre avec la même boîte',
        '4. La boîte est nettoyée et remise en circulation'
      ],
      stats: {
        boxes: '10,000+ boîtes en circulation',
        reuse: '50x réutilisations moyennes',
        locations: '200+ points de collecte'
      }
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'payment-system',
    title: '💳 Système de paiement sécurisé',
    description: 'Découvrez notre système de paiement transparent avec séquestre automatique pour votre sécurité.',
    image: '/images/onboarding/client/payment.png',
    content: {
      features: [
        {
          title: 'Paiement sécurisé',
          description: 'Vos fonds sont bloqués jusqu\'à la livraison confirmée',
          icon: '🔒'
        },
        {
          title: 'Tarification transparente',
          description: 'Pas de frais cachés, tout est affiché clairement',
          icon: '💎'
        },
        {
          title: 'Remboursement garanti',
          description: 'Protection automatique en cas de problème',
          icon: '🛡️'
        },
        {
          title: 'Points de fidélité',
          description: 'Gagnez des EcoPoints à chaque livraison',
          icon: '🌟'
        }
      ],
      security: [
        'Chiffrement SSL 256 bits',
        'Conformité PCI DSS',
        'Audit de sécurité mensuel',
        'Assurance couvrant 100% des transactions'
      ]
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'environmental-impact',
    title: '🌱 Votre impact environnemental',
    description: 'Découvrez comment chacune de vos livraisons contribue à un monde plus durable.',
    image: '/images/onboarding/client/environment.png',
    content: {
      calculator: {
        title: 'Calculateur d\'impact',
        description: 'Chaque livraison EcoDeli vs livraison traditionnelle'
      },
      metrics: [
        {
          title: 'CO2 économisé',
          traditional: '2.5 kg CO2',
          ecodeli: '0.5 kg CO2',
          saving: '80% de réduction'
        },
        {
          title: 'Emballages',
          traditional: '3 emballages jetables',
          ecodeli: '1 emballage réutilisable',
          saving: '90% de déchets en moins'
        },
        {
          title: 'Emploi local',
          traditional: 'Automatisation',
          ecodeli: 'Emploi local créé',
          saving: '100% humain'
        }
      ],
      gamification: {
        title: 'Programme EcoWarrior',
        levels: ['Débutant Vert', 'Eco-Citoyen', 'Champion Durable', 'EcoWarrior'],
        rewards: ['Réductions exclusives', 'Accès prioritaire', 'Cadeaux durables']
      }
    },
    isMission1: true,
    isRequired: true,
  },
  {
    id: 'mission1-complete',
    title: '🎉 Mission 1 accomplie !',
    description: 'Félicitations ! Vous maîtrisez maintenant les bases d\'EcoDeli. Vous êtes prêt à commencer votre aventure écologique.',
    image: '/images/onboarding/client/completion.png',
    content: {
      achievements: [
        '✅ Concept EcoDeli maîtrisé',
        '✅ Navigation dans la plateforme',
        '✅ Création d\'annonces',
        '✅ Système de tracking',
        '✅ Écosystème de services',
        '✅ Stockage intelligent',
        '✅ Paiements sécurisés',
        '✅ Impact environnemental',
      ],
      nextSteps: [
        '🚀 Créez votre première annonce',
        '🔍 Explorez les services disponibles',
        '📦 Testez le système de stockage',
        '🌟 Gagnez vos premiers EcoPoints'
      ],
      unlocked: [
        'Accès complet à la plateforme',
        'Programme de fidélité EcoWarrior',
        'Support client prioritaire',
        'Notifications personnalisées'
      ]
    },
    isMission1: true,
    isRequired: true,
    isCompletion: true
  }
];

type ClientTutorialProps = {
  options?: {
    redirectTo?: string;
    onComplete?: () => Promise<void>;
  };
  isMission1?: boolean;
  mission1Hook?: any; // Hook Mission 1 depuis le contrôleur
};

/**
 * Tutoriel client étendu avec Mission 1 complète
 */
export function ClientTutorial({ 
  options, 
  isMission1 = false, 
  mission1Hook 
}: ClientTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  // Utiliser le hook Mission 1 si fourni, sinon état local
  const currentStepIndex = mission1Hook?.currentStep ?? currentStep;
  const totalSteps = CLIENT_TUTORIAL_STEPS.length;

  // Configurer les étapes dans le hook Mission 1
  useEffect(() => {
    if (mission1Hook && isMission1) {
      mission1Hook.setStepsConfiguration(0, totalSteps);
    }
  }, [mission1Hook, isMission1, totalSteps]);

  // Gestionnaire pour la completion du tutoriel
  const handleComplete = () => {
    setIsCompleting(true);
    
    const completeAsync = async () => {
      try {
        if (isMission1 && mission1Hook) {
          await mission1Hook.completeMission1();
        } else if (options?.onComplete) {
          await options.onComplete();
        }
      } catch (error) {
        console.error('Erreur lors de la completion:', error);
      } finally {
        setIsCompleting(false);
      }
    };
    
    completeAsync();
  };

  // Navigation entre les étapes
  const goToStep = (stepIndex: number) => {
    if (mission1Hook) {
      mission1Hook.goToStep(stepIndex);
    } else {
      setCurrentStep(stepIndex);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  // Rendu du contenu de l'étape
  const renderStepContent = () => {
    const step = CLIENT_TUTORIAL_STEPS[currentStepIndex];
    if (!step) return null;

    return (
      <div className="space-y-6">
        {/* En-tête de l'étape */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {step.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {step.description}
          </p>
          
          {step.isMission1 && (
            <Badge variant="destructive" className="mt-2">
              Mission 1 - Étape {currentStepIndex + 1}/{totalSteps}
            </Badge>
          )}
        </div>

        {/* Contenu spécifique à chaque étape */}
        <div className="max-h-96 overflow-y-auto">
          {step.id === 'welcome' && (
            <WelcomeStepContent step={step} />
          )}
          
          {step.id === 'ecodeli-concept' && (
            <ConceptStepContent step={step} />
          )}
          
          {step.id === 'dashboard-overview' && (
            <DashboardStepContent step={step} />
          )}
          
          {step.id === 'create-announcement' && (
            <AnnouncementStepContent step={step} />
          )}
          
          {step.id === 'delivery-tracking' && (
            <TrackingStepContent step={step} />
          )}
          
          {step.id === 'services-ecosystem' && (
            <ServicesStepContent step={step} />
          )}
          
          {step.id === 'storage-system' && (
            <StorageStepContent step={step} />
          )}
          
          {step.id === 'payment-system' && (
            <PaymentStepContent step={step} />
          )}
          
          {step.id === 'environmental-impact' && (
            <EnvironmentStepContent step={step} />
          )}
          
          {step.id === 'mission1-complete' && (
            <CompletionStepContent step={step} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Barre de progression */}
      <TutorialProgress 
        currentStep={currentStepIndex} 
        totalSteps={totalSteps}
      />
      
      {/* Contenu de l'étape */}
      {renderStepContent()}
      
      {/* Navigation */}
      <TutorialNavigation
        currentStep={currentStepIndex}
        totalSteps={totalSteps}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
        onSkip={isMission1 ? () => {} : handleComplete} // Pas de skip pour Mission 1
        onComplete={handleComplete}
        isLoading={isCompleting}
        labels={navigationLabels}
      />
    </div>
  );
}

// Composants pour le contenu spécifique de chaque étape

function WelcomeStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <p className="text-green-800 mb-4">{step.content.intro}</p>
        <h4 className="font-semibold text-green-900 mb-2">Objectifs de Mission 1 :</h4>
        <ul className="space-y-1">
          {step.content.objectives.map((objective: string, index: number) => (
            <li key={index} className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              {objective}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ConceptStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {step.content.highlights.map((highlight: string, index: number) => (
          <div key={index} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-800">{highlight}</p>
          </div>
        ))}
      </div>
      
      <div className="bg-green-100 p-6 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-4">Notre impact :</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{step.content.impact.co2Reduction}</div>
            <div className="text-sm text-green-700">de CO2 en moins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{step.content.impact.packaging}</div>
            <div className="text-sm text-green-700">d'emballages réutilisés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{step.content.impact.localJobs}</div>
            <div className="text-sm text-green-700">emplois locaux créés</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardStepContent({ step }: { step: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {step.content.features.map((feature: any, index: number) => (
        <Card key={index} className="border-blue-200">
          <CardHeader className="text-center">
            <div className="text-3xl mb-2">{feature.icon}</div>
            <CardTitle className="text-lg">{feature.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnnouncementStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-4">Étapes de création :</h4>
        <ol className="space-y-2">
          {step.content.steps.map((stepItem: string, index: number) => (
            <li key={index} className="text-blue-800">{stepItem}</li>
          ))}
        </ol>
      </div>
      
      <div className="bg-yellow-50 p-6 rounded-lg">
        <h4 className="font-semibold text-yellow-900 mb-4">Conseils d'expert :</h4>
        <ul className="space-y-2">
          {step.content.tips.map((tip: string, index: number) => (
            <li key={index} className="text-yellow-800">{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrackingStepContent({ step }: { step: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {step.content.features.map((feature: any, index: number) => (
        <Card key={index} className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{feature.icon}</span>
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ServicesStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-4">
      {step.content.categories.map((category: any, index: number) => (
        <Card key={index} className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{category.title}</span>
            </CardTitle>
            <CardDescription>{category.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {category.examples.map((example: string, exIndex: number) => (
                <Badge key={exIndex} variant="outline" className="text-xs">
                  {example}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StorageStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg">
        <h4 className="font-semibold text-purple-900 mb-4">Avantages :</h4>
        <ul className="space-y-2">
          {step.content.benefits.map((benefit: string, index: number) => (
            <li key={index} className="text-purple-800">{benefit}</li>
          ))}
        </ul>
      </div>
      
      <div className="bg-orange-50 p-6 rounded-lg">
        <h4 className="font-semibold text-orange-900 mb-4">Comment ça marche :</h4>
        <ol className="space-y-2">
          {step.content.howItWorks.map((stepItem: string, index: number) => (
            <li key={index} className="text-orange-800">{stepItem}</li>
          ))}
        </ol>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-xl font-bold text-gray-700">{step.content.stats.boxes}</div>
          <div className="text-sm text-gray-600">en circulation</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-xl font-bold text-gray-700">{step.content.stats.reuse}</div>
          <div className="text-sm text-gray-600">réutilisations</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-xl font-bold text-gray-700">{step.content.stats.locations}</div>
          <div className="text-sm text-gray-600">points de collecte</div>
        </div>
      </div>
    </div>
  );
}

function PaymentStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {step.content.features.map((feature: any, index: number) => (
          <Card key={index} className="border-green-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{feature.icon}</span>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Sécurité garantie :</h4>
        <ul className="grid grid-cols-2 gap-2">
          {step.content.security.map((item: string, index: number) => (
            <li key={index} className="flex items-center gap-2 text-gray-700">
              <Shield className="h-4 w-4 text-green-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EnvironmentStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 p-6 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-4">{step.content.calculator.title}</h4>
        <p className="text-green-700 mb-4">{step.content.calculator.description}</p>
        
        <div className="space-y-4">
          {step.content.metrics.map((metric: any, index: number) => (
            <div key={index} className="bg-white p-4 rounded border">
              <div className="font-medium text-gray-900 mb-2">{metric.title}</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-red-600">
                  Traditionnel: {metric.traditional}
                </div>
                <div className="text-green-600">
                  EcoDeli: {metric.ecodeli}
                </div>
                <div className="font-medium text-blue-600">
                  {metric.saving}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-4">{step.content.gamification.title}</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium mb-2">Niveaux :</h5>
            <ul className="space-y-1">
              {step.content.gamification.levels.map((level: string, index: number) => (
                <li key={index} className="flex items-center gap-2 text-blue-700">
                  <Star className="h-4 w-4" />
                  {level}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Récompenses :</h5>
            <ul className="space-y-1">
              {step.content.gamification.rewards.map((reward: string, index: number) => (
                <li key={index} className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="h-4 w-4" />
                  {reward}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionStepContent({ step }: { step: any }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      
      <div className="bg-green-50 p-6 rounded-lg">
        <h4 className="font-semibold text-green-900 mb-4">Compétences acquises :</h4>
        <div className="grid grid-cols-2 gap-2">
          {step.content.achievements.map((achievement: string, index: number) => (
            <div key={index} className="text-green-700 text-sm">{achievement}</div>
          ))}
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-4">Prochaines étapes :</h4>
        <div className="grid grid-cols-2 gap-2">
          {step.content.nextSteps.map((nextStep: string, index: number) => (
            <div key={index} className="text-blue-700 text-sm">{nextStep}</div>
          ))}
        </div>
      </div>
      
      <div className="bg-yellow-50 p-6 rounded-lg">
        <h4 className="font-semibold text-yellow-900 mb-4">Fonctionnalités débloquées :</h4>
        <div className="grid grid-cols-2 gap-2">
          {step.content.unlocked.map((unlocked: string, index: number) => (
            <div key={index} className="text-yellow-700 text-sm">{unlocked}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
