// src/app/courier/announcements/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

import { CourierAnnouncementSearch } from "@/components/announcements/courier-announcement-search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Route, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Opportunités de livraison | EcoDeli",
  description: "Trouvez des opportunités de livraison adaptées à votre trajet",
};

// Page skeleton pour le chargement
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <Skeleton className="h-64 w-full" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

// Vérifier si l'utilisateur est un livreur
async function checkCourierStatus(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        courierProfile: true,
      },
    });
    
    return !!user?.courierProfile;
  } catch (error) {
    console.error("Erreur lors de la vérification du statut de livreur:", error);
    return false;
  }
}

export default async function CourierAnnouncementsPage() {
  const session = await getServerSession(authOptions);
  
  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session?.user) {
    redirect("/login?callbackUrl=/courier/announcements");
  }
  
  // Vérifier si l'utilisateur est un livreur
  const isCourier = await checkCourierStatus(session.user.id);
  
  // Rediriger vers la page de profil si l'utilisateur n'est pas un livreur
  if (!isCourier) {
    redirect("/courier/profile?message=Vous+devez+compléter+votre+profil+de+livreur+pour+accéder+à+cette+page");
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Opportunités de livraison</h2>
        <div className="flex space-x-2">
          <Link href="/courier/announcements/routes">
            <Button variant="outline">
              <Route className="mr-2 h-4 w-4" />
              Mes trajets
            </Button>
          </Link>
          <Link href="/courier/announcements/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Proposer un trajet
            </Button>
          </Link>
        </div>
      </div>
      
      <Suspense fallback={<LoadingSkeleton />}>
        <CourierAnnouncementSearch />
      </Suspense>
    </div>
  );
}