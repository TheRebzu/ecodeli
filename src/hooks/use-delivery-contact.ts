import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/trpc/react';

// Schéma de validation pour le formulaire de contact
const contactSchema = z.object({
  message: z.string().min(5, 'Votre message doit contenir au moins 5 caractères'),
  contactMethod: z.enum(['SMS', 'CALL', 'APP_MESSAGE']),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactErrorResponse {
  message: string;
}

interface DelivererContactInfo {
  id: string;
  name: string;
  phone?: string;
  image?: string;
}

/**
 * Hook pour gérer le contact avec le livreur
 */
export function useDeliveryContact(deliveryId: string) {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  // Mutation pour envoyer un message au livreur
  // Temporairement utilise reportIssue comme alternative à contactDeliverer
  const { mutate: contactDeliverer, isPending } = trpc.deliveryTracking.reportIssue.useMutation({
    onSuccess: () => {
      toast.success('Message envoyé au livreur');
      setIsContactDialogOpen(false);
      form.reset();
    },
    onError: (error: ContactErrorResponse) => {
      toast.error(`Erreur: ${error.message || 'Impossible de contacter le livreur'}`);
    },
  });

  // Formulaire de contact
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      message: '',
      contactMethod: 'APP_MESSAGE',
    },
  });

  // Gérer l'envoi du formulaire
  const handleSubmit = (data: ContactFormData) => {
    contactDeliverer({
      deliveryId,
      type: 'CLIENT_MESSAGE',
      description: data.message,
      severity: 'LOW',
    });
  };

  // Obtenir les infos du livreur depuis les détails de la livraison
  const { data: deliveryDetails, isLoading: isLoadingDeliverer } =
    trpc.deliveryTracking.getDeliveryById.useQuery(
      { deliveryId },
      {
        enabled: !!deliveryId,
        refetchOnWindowFocus: false,
      }
    );

  // Extraire les informations du livreur
  const delivererInfo = deliveryDetails?.deliverer
    ? {
        id: deliveryDetails.deliverer.id,
        name: deliveryDetails.deliverer.name,
        phone: deliveryDetails.deliverer.phone,
        image: deliveryDetails.deliverer.image,
      }
    : undefined;

  return {
    isContactDialogOpen,
    setIsContactDialogOpen,
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isLoading: isPending || isLoadingDeliverer,
    delivererInfo,
  };
}
