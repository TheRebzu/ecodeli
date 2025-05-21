'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useVerification } from '@/hooks/use-verification';
import { useVerificationStore } from '@/store/use-verification-store';
import { VerificationDocumentType } from '@/types/verification';
import { DocumentUpload } from './document-upload';
import { DocumentList } from './document-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle } from 'lucide-react';

// Schéma Zod pour le formulaire
const verificationFormSchema = z.object({
  notes: z.string().optional(),
});

type VerificationFormData = z.infer<typeof verificationFormSchema>;

interface VerificationFormProps {
  requiredDocuments: {
    type: string;
    label: string;
    description: string;
  }[];
  verificationType: 'MERCHANT' | 'PROVIDER';
  title?: string;
  description?: string;
  submitButtonText?: string;
  onSuccess?: () => void;
}

export function VerificationForm({
  requiredDocuments,
  verificationType,
  title = 'Vérification du compte',
  description = 'Téléchargez les documents requis pour vérifier votre compte',
  submitButtonText = 'Soumettre pour vérification',
  onSuccess,
}: VerificationFormProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id as string;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook et store de vérification
  const { submitVerification } = useVerification();
  const pendingDocuments = useVerificationStore((state) => state.pendingDocuments);
  const setRequiredDocuments = useVerificationStore((state) => state.setRequiredDocuments);
  const reset = useVerificationStore((state) => state.reset);
  
  // Enregistrer les documents requis dans le store
  useState(() => {
    setRequiredDocuments(requiredDocuments.map((doc) => doc.type));
  });
  
  // Formulaire
  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationFormSchema),
    defaultValues: {
      notes: '',
    },
  });
  
  // Vérifier si tous les documents requis ont été téléchargés
  const areAllDocumentsUploaded = () => {
    const uploadedTypes = pendingDocuments.map((doc) => doc.documentType);
    
    return requiredDocuments.every((doc) => uploadedTypes.includes(doc.type));
  };
  
  // Soumettre le formulaire
  const onSubmit = async (data: VerificationFormData) => {
    if (!session?.user?.id) {
      setError('Vous devez être connecté pour soumettre une vérification');
      return;
    }
    
    if (!areAllDocumentsUploaded()) {
      setError('Vous devez télécharger tous les documents requis');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await submitVerification(verificationType, userId, pendingDocuments);
      
      // Réinitialiser le store après la soumission
      reset();
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirection par défaut vers la page de statut
        router.push(`/verification/status?type=${verificationType.toLowerCase()}`);
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError('Une erreur est survenue lors de la soumission. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground mt-2">{description}</p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Documents requis</CardTitle>
              <CardDescription>
                Tous les documents suivants sont nécessaires pour compléter la vérification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {requiredDocuments.map((document, index) => (
                <div key={document.type} className="space-y-4">
                  <DocumentUpload
                    userId={userId}
                    documentType={document.type}
                    label={document.label}
                    description={document.description}
                  />
                  {index < requiredDocuments.length - 1 && (
                    <div className="h-px bg-border my-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          
          {pendingDocuments.length > 0 && (
            <DocumentList
              title="Documents téléchargés"
              description="Ces documents seront examinés par notre équipe"
            />
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Notes complémentaires</CardTitle>
              <CardDescription>
                Ajoutez des informations supplémentaires si nécessaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informations complémentaires pour notre équipe de vérification..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ces notes seront visibles par notre équipe de vérification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !areAllDocumentsUploaded()}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Envoi en cours...' : submitButtonText}
          </Button>
        </div>
        
        {!areAllDocumentsUploaded() && (
          <Alert className="bg-yellow-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Documents manquants</AlertTitle>
            <AlertDescription>
              Veuillez télécharger tous les documents requis avant de soumettre votre demande
            </AlertDescription>
          </Alert>
        )}
      </form>
    </Form>
  );
} 