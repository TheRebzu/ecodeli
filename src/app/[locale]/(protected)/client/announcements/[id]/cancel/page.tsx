"use client";

import { useParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentCancelPage() {
  const params = useParams();
  const router = useRouter();
  const announcementId = params.id as string;

  const handleRetryPayment = () => {
    router.push(`/client/announcements/${announcementId}`);
  };

  const handleBackToAnnouncements = () => {
    router.push("/client/announcements");
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 mx-auto text-orange-500" />
          <CardTitle className="text-orange-700">Paiement annulé</CardTitle>
          <CardDescription>
            Vous avez annulé le processus de paiement
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">Que faire maintenant ?</h3>
            <ul className="mt-2 text-sm text-orange-700 list-disc list-inside">
              <li>Vous pouvez réessayer le paiement à tout moment</li>
              <li>Votre annonce reste en brouillon</li>
              <li>Aucun frais n'a été prélevé</li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetryPayment} className="w-full">
              Réessayer le paiement
            </Button>
            <Button 
              variant="outline" 
              onClick={handleBackToAnnouncements} 
              className="w-full"
            >
              Retour aux annonces
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 