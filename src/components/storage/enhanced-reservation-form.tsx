'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { boxReservationCreateSchema, BoxReservationCreateInput } from '@/schemas/storage.schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { OptimalPricingCalculator } from './optimal-pricing-calculator';
import { BoxRecommendations } from './box-recommendations';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  CreditCard,
  Package,
  FileText
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/trpc/react';

interface BoxWithWarehouse {
  id: string;
  name: string;
  size: number;
  pricePerDay: number;
  boxType: string;
  description?: string;
  features?: string[];
  warehouse: {
    id: string;
    name: string;
    address: string;
  };
}

interface EnhancedReservationFormProps {
  box: BoxWithWarehouse;
  startDate: Date;
  endDate: Date;
  onBack?: () => void;
  onSuccess?: (reservationId: string) => void;
}

type ReservationStep = 'selection' | 'details' | 'payment' | 'confirmation';

export function EnhancedReservationForm({ 
  box, 
  startDate, 
  endDate, 
  onBack,
  onSuccess 
}: EnhancedReservationFormProps) {
  const [step, setStep] = useState<ReservationStep>('selection');
  const [selectedBox, setSelectedBox] = useState(box);
  const [calculatedPricing, setCalculatedPricing] = useState<any>(null);

  // Mutation pour créer la réservation
  const createReservation = api.storage.createBoxReservation.useMutation();

  const form = useForm<BoxReservationCreateInput>({
    resolver: zodResolver(boxReservationCreateSchema),
    defaultValues: {
      boxId: selectedBox.id,
      startDate,
      endDate,
      notes: '',
    },
  });

  const onSubmit = (data: BoxReservationCreateInput) => {
    createReservation.mutate({
      ...data,
      boxId: selectedBox.id,
    }, {
      onSuccess: (result) => {
        setStep('confirmation');
        onSuccess?.(result.id);
      },
    });
  };

  const handleStepForward = () => {
    const steps: ReservationStep[] = ['selection', 'details', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleStepBack = () => {
    const steps: ReservationStep[] = ['selection', 'details', 'payment', 'confirmation'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      onBack?.();
    }
  };

  const getStepProgress = () => {
    const steps = ['selection', 'details', 'payment', 'confirmation'];
    return ((steps.indexOf(step) + 1) / steps.length) * 100;
  };

  const getStepIcon = (stepName: ReservationStep) => {
    switch (stepName) {
      case 'selection': return Package;
      case 'details': return FileText;
      case 'payment': return CreditCard;
      case 'confirmation': return CheckCircle2;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'selection':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Box sélectionnée</CardTitle>
                <CardDescription>
                  Vérifiez votre sélection ou explorez d'autres options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold">{selectedBox.name}</h3>
                    <Badge variant="outline">{selectedBox.boxType}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>Taille: {selectedBox.size}m²</div>
                    <div>Prix: {selectedBox.pricePerDay}€/jour</div>
                    <div>Entrepôt: {selectedBox.warehouse.name}</div>
                    <div>Adresse: {selectedBox.warehouse.address}</div>
                  </div>
                  {selectedBox.features && selectedBox.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedBox.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommandations alternatives */}
            <BoxRecommendations
              filters={{
                warehouseId: selectedBox.warehouse.id,
                startDate,
                endDate,
              }}
              onBoxSelect={(boxId) => {
                // Dans un cas réel, il faudrait récupérer les détails de la box
                console.log('Box alternative sélectionnée:', boxId);
              }}
              maxRecommendations={3}
            />
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails de la réservation</CardTitle>
                <CardDescription>
                  Période du {format(startDate, 'PPP', { locale: fr })} au{' '}
                  {format(endDate, 'PPP', { locale: fr })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes additionnelles</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Décrivez vos besoins spécifiques ou toute information importante..."
                            className="resize-none"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Ces informations aideront le gestionnaire de l'entrepôt à mieux vous servir
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </CardContent>
            </Card>
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <OptimalPricingCalculator
              boxId={selectedBox.id}
              startDate={startDate}
              endDate={endDate}
              onPriceCalculated={setCalculatedPricing}
            />

            <Card>
              <CardHeader>
                <CardTitle>Simulation de paiement</CardTitle>
                <CardDescription>
                  Mode démonstration - Aucun paiement réel ne sera effectué
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Mode simulation</AlertTitle>
                  <AlertDescription>
                    Cette interface simule un processus de paiement. Dans un environnement de production, 
                    vous seriez redirigé vers un processeur de paiement sécurisé.
                  </AlertDescription>
                </Alert>

                <div className="mt-4 space-y-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Méthode de paiement simulée</h4>
                    <div className="text-sm text-muted-foreground">
                      Carte de crédit se terminant par ****1234
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'confirmation':
        return (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Réservation confirmée !</h3>
                  <p className="text-muted-foreground">
                    Votre box {selectedBox.name} est maintenant réservée
                  </p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium mb-2">Détails de la réservation</h4>
                  <div className="space-y-1 text-sm">
                    <div>Box: {selectedBox.name}</div>
                    <div>Entrepôt: {selectedBox.warehouse.name}</div>
                    <div>
                      Période: {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
                    </div>
                    {calculatedPricing && (
                      <div>Total: {calculatedPricing.finalPrice?.toFixed(2)}€</div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Un code d'accès vous sera envoyé par email
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vous pouvez maintenant accéder à votre box aux horaires d'ouverture
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Processus de réservation</h2>
              <Badge variant="outline">
                Étape {['selection', 'details', 'payment', 'confirmation'].indexOf(step) + 1} sur 4
              </Badge>
            </div>
            
            <Progress value={getStepProgress()} className="w-full" />
            
            <div className="flex justify-between">
              {(['selection', 'details', 'payment', 'confirmation'] as ReservationStep[]).map((stepName, index) => {
                const StepIcon = getStepIcon(stepName);
                const isActive = step === stepName;
                const isCompleted = ['selection', 'details', 'payment', 'confirmation'].indexOf(step) > index;
                
                return (
                  <div
                    key={stepName}
                    className={`flex items-center space-x-2 ${
                      isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="h-4 w-4" />
                    <span className="text-sm font-medium capitalize">
                      {stepName === 'selection' && 'Sélection'}
                      {stepName === 'details' && 'Détails'}
                      {stepName === 'payment' && 'Paiement'}
                      {stepName === 'confirmation' && 'Confirmation'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleStepBack}
              disabled={createReservation.isPending}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 'selection' ? 'Retour' : 'Précédent'}
            </Button>
            
            {step !== 'confirmation' && (
              <Button 
                onClick={step === 'payment' ? form.handleSubmit(onSubmit) : handleStepForward}
                disabled={createReservation.isPending}
              >
                {createReservation.isPending ? (
                  'Traitement...'
                ) : step === 'payment' ? (
                  'Confirmer la réservation'
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {createReservation.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {createReservation.error.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}