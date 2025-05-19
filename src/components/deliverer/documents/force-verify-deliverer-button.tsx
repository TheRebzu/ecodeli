'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RefreshCw } from 'lucide-react';

export default function ForceVerifyDelivererButton() {
  const { toast } = useToast();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const forceVerifyMutation = api.verification.manualCheckAndUpdateVerification.useMutation({
    onSuccess: data => {
      if (data.success) {
        toast({
          title: 'Vérification en cours',
          description: data.message,
          variant: 'success',
        });
        // Rafraîchir la page après 2 secondes
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: 'Information',
          description: data.message,
        });
      }
    },
    onError: error => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la vérification: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleVerify = () => {
    forceVerifyMutation.mutate();
    setIsConfirmDialogOpen(false);
  };

  return (
    <>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Forcer la vérification de mon compte
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la vérification manuelle</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va tenter de vérifier manuellement votre compte si tous vos documents ont
              été approuvés. Si certains documents sont encore en attente ou rejetés, cette action
              n'aura pas d'effet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerify} disabled={forceVerifyMutation.isPending}>
              {forceVerifyMutation.isPending
                ? 'Vérification en cours...'
                : 'Confirmer la vérification'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
