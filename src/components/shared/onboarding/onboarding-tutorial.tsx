'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Play,
  Package,
  MapPin,
  Calendar,
  CreditCard,
  Bell,
  Settings,
  MessageCircle,
  Star,
  Shield,
  Truck,
  ShoppingBag,
  Users,
  Home,
  FileText,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils/common';
import { api } from '@/trpc/react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  actions?: {
    primary?: {
      label: string;
      action: () => void;
    };
    secondary?: {
      label: string;
      action: () => void;
    };
  };
}

interface OnboardingTutorialProps {
  userRole: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN';
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function OnboardingTutorial({
  userRole,
  onComplete,
  onSkip,
}: OnboardingTutorialProps) {
  const t = useTranslations('onboarding');
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Mutation pour marquer le tutorial comme terminé
  const completeTutorialMutation = api.user.completeTutorial.useMutation();

  // Vérifier si l'utilisateur a déjà vu le tutorial
  const { data: userPreferences } = api.user.getPreferences.useQuery();

  useEffect(() => {
    // Afficher le tutorial si l'utilisateur ne l'a jamais vu
    if (userPreferences && !userPreferences.hasCompletedTutorial) {
      setIsOpen(true);
    }
  }, [userPreferences]);

  // Définir les étapes du tutorial selon le rôle
  const getStepsForRole = (role: string): OnboardingStep[] => {
    switch (role) {
      case 'CLIENT':
        return [
          {
            id: 'welcome-client',
            title: t('client.welcome.title'),
            description: t('client.welcome.description'),
            icon: <Package className="h-8 w-8 text-blue-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('client.welcome.content')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-5 w-5 text-green-500" />
                      <span className="font-medium">{t('client.features.deliveries')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('client.features.deliveriesDesc')}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">{t('client.features.services')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('client.features.servicesDesc')}
                    </p>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: 'create-announcement',
            title: t('client.announcement.title'),
            description: t('client.announcement.description'),
            icon: <Package className="h-8 w-8 text-green-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('client.announcement.content')}</p>
                <div className="bg-muted/40 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('client.announcement.step1')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('client.announcement.step1Desc')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/40 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Calendar className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{t('client.announcement.step2')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('client.announcement.step2Desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ),
            actions: {
              primary: {
                label: t('client.announcement.createFirst'),
                action: () => window.open('/client/announcements/create', '_blank'),
              },
            },
          },
          {
            id: 'track-deliveries',
            title: t('client.tracking.title'),
            description: t('client.tracking.description'),
            icon: <MapPin className="h-8 w-8 text-orange-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('client.tracking.content')}</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Bell className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">{t('client.tracking.notifications')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">{t('client.tracking.realtime')}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-purple-500" />
                    <span className="text-sm font-medium">{t('client.tracking.communication')}</span>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'payments-tips',
            title: t('client.payments.title'),
            description: t('client.payments.description'),
            icon: <CreditCard className="h-8 w-8 text-purple-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('client.payments.content')}</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{t('client.payments.secure')}</span>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      {t('client.payments.encrypted')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{t('client.payments.rating')}</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-600">
                      {t('client.payments.optional')}
                    </Badge>
                  </div>
                </div>
              </div>
            ),
          },
        ];

      case 'DELIVERER':
        return [
          {
            id: 'welcome-deliverer',
            title: t('deliverer.welcome.title'),
            description: t('deliverer.welcome.description'),
            icon: <Truck className="h-8 w-8 text-blue-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('deliverer.welcome.content')}</p>
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{t('deliverer.welcome.earnings')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('deliverer.welcome.earningsDesc')}
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: 'documents-verification',
            title: t('deliverer.documents.title'),
            description: t('deliverer.documents.description'),
            icon: <FileText className="h-8 w-8 text-orange-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('deliverer.documents.content')}</p>
                <div className="space-y-2">
                  {[
                    t('deliverer.documents.identity'),
                    t('deliverer.documents.license'),
                    t('deliverer.documents.insurance'),
                    t('deliverer.documents.background'),
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
            actions: {
              primary: {
                label: t('deliverer.documents.upload'),
                action: () => window.open('/deliverer/documents', '_blank'),
              },
            },
          },
          {
            id: 'accept-deliveries',
            title: t('deliverer.deliveries.title'),
            description: t('deliverer.deliveries.description'),
            icon: <Package className="h-8 w-8 text-green-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('deliverer.deliveries.content')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <MapPin className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-sm font-medium">{t('deliverer.deliveries.matching')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('deliverer.deliveries.matchingDesc')}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Truck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-sm font-medium">{t('deliverer.deliveries.tracking')}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('deliverer.deliveries.trackingDesc')}
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'earnings-wallet',
            title: t('deliverer.wallet.title'),
            description: t('deliverer.wallet.description'),
            icon: <Wallet className="h-8 w-8 text-purple-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('deliverer.wallet.content')}</p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">¬15-25</div>
                  <div className="text-sm text-muted-foreground">
                    {t('deliverer.wallet.averagePerDelivery')}
                  </div>
                </div>
              </div>
            ),
            actions: {
              primary: {
                label: t('deliverer.wallet.viewWallet'),
                action: () => window.open('/deliverer/wallet', '_blank'),
              },
            },
          },
        ];

      case 'MERCHANT':
        return [
          {
            id: 'welcome-merchant',
            title: t('merchant.welcome.title'),
            description: t('merchant.welcome.description'),
            icon: <ShoppingBag className="h-8 w-8 text-blue-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('merchant.welcome.content')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <BarChart3 className="h-6 w-6 text-green-500 mb-2" />
                    <div className="font-medium">{t('merchant.features.analytics')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('merchant.features.analyticsDesc')}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <Users className="h-6 w-6 text-purple-500 mb-2" />
                    <div className="font-medium">{t('merchant.features.customers')}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('merchant.features.customersDesc')}
                    </div>
                  </Card>
                </div>
              </div>
            ),
          },
          {
            id: 'catalog-management',
            title: t('merchant.catalog.title'),
            description: t('merchant.catalog.description'),
            icon: <Package className="h-8 w-8 text-green-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('merchant.catalog.content')}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 border rounded">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">{t('merchant.catalog.step1')}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{t('merchant.catalog.step2')}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 border rounded">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm">{t('merchant.catalog.step3')}</span>
                  </div>
                </div>
              </div>
            ),
            actions: {
              primary: {
                label: t('merchant.catalog.createProduct'),
                action: () => window.open('/merchant/catalog/create', '_blank'),
              },
            },
          },
        ];

      case 'PROVIDER':
        return [
          {
            id: 'welcome-provider',
            title: t('provider.welcome.title'),
            description: t('provider.welcome.description'),
            icon: <Users className="h-8 w-8 text-blue-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('provider.welcome.content')}</p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{t('provider.welcome.expertise')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('provider.welcome.expertiseDesc')}
                  </p>
                </div>
              </div>
            ),
          },
          {
            id: 'services-skills',
            title: t('provider.services.title'),
            description: t('provider.services.description'),
            icon: <Settings className="h-8 w-8 text-green-500" />,
            content: (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('provider.services.content')}</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded">
                    <Home className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{t('provider.services.home')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('provider.services.homeDesc')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded">
                    <Settings className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">{t('provider.services.maintenance')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('provider.services.maintenanceDesc')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
            actions: {
              primary: {
                label: t('provider.services.create'),
                action: () => window.open('/provider/services/create', '_blank'),
              },
            },
          },
        ];

      default:
        return [];
    }
  };

  const steps = getStepsForRole(userRole);
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps([...completedSteps, steps[currentStep].id]);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await completeTutorialMutation.mutateAsync();
      setIsOpen(false);
      onComplete?.();
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const handleSkip = async () => {
    try {
      await completeTutorialMutation.mutateAsync();
      setIsOpen(false);
      onSkip?.();
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  };

  if (!isOpen || steps.length === 0) {
    return null;
  }

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              <div>
                <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
                <DialogDescription className="text-base">
                  {currentStepData.description}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {t('step')} {currentStep + 1} {t('of')} {steps.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="py-6">
          <Card>
            <CardContent className="p-6">{currentStepData.content}</CardContent>
          </Card>

          {/* Action buttons from step config */}
          {currentStepData.actions && (
            <div className="mt-4 flex gap-2">
              {currentStepData.actions.secondary && (
                <Button
                  variant="outline"
                  onClick={currentStepData.actions.secondary.action}
                  className="flex-1"
                >
                  {currentStepData.actions.secondary.label}
                </Button>
              )}
              {currentStepData.actions.primary && (
                <Button onClick={currentStepData.actions.primary.action} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  {currentStepData.actions.primary.label}
                </Button>
              )}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              {t('skipTutorial')}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="min-w-24"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('previous')}
            </Button>
            <Button onClick={handleNext} className="min-w-24">
              {currentStep === steps.length - 1 ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('finish')}
                </>
              ) : (
                <>
                  {t('next')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}