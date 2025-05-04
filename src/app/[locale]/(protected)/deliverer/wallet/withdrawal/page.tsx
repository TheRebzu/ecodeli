import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WithdrawalForm } from "@/components/payments/withdrawal-form";
import { db } from "@/server/db";

export const metadata = {
  title: "Demande de virement | EcoDeli",
  description: "Retirez vos revenus vers votre compte bancaire",
};

export default async function WithdrawalPage() {
  // Vérifier l'authentification et le rôle
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login?callbackUrl=/deliverer/wallet/withdrawal');
  }
  
  if (session.user.role !== 'DELIVERER') {
    // Rediriger les utilisateurs non autorisés
    redirect('/');
  }
  
  // Récupérer le portefeuille de l'utilisateur
  const wallet = await db.wallet.findUnique({
    where: { userId: session.user.id },
  });
  
  if (!wallet) {
    redirect('/deliverer/wallet');
  }
  
  return (
    <div className="container py-8">
      <div className="mb-6">
        <Link href="/deliverer/wallet" className="flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au portefeuille
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-6">Demande de virement</h1>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Demander un virement</CardTitle>
              <CardDescription>
                Les virements sont traités dans un délai de 3 à 5 jours ouvrables. 
                Le montant minimum est de 10€.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalForm 
                balance={Number(wallet.balance)} 
                currency={wallet.currency}
                walletId={wallet.id}
              />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Conditions</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Montant minimum : 10€</li>
                  <li>Frais de virement : 0€</li>
                  <li>Délai de traitement : 3-5 jours ouvrables</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium">Méthodes de paiement</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Les virements sont effectués sur le compte bancaire associé à votre compte Stripe Connect.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Besoin d'aide ?</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Si vous avez des questions concernant les virements, contactez notre 
                  <Link href="/support" className="text-primary hover:underline ml-1">
                    service d'assistance
                  </Link>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 