// src/app/client/announcements/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { AnnouncementsList } from "@/components/announcements/announcements-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Boxes, Clock, CheckCircle, XCircle } from "lucide-react";
import { AnnouncementStatsCards } from "@/components/announcements/announcement-stats-cards";

export const metadata: Metadata = {
  title: "Mes annonces | EcoDeli",
  description: "Gérez vos annonces de livraison",
};

// Page skeleton pour le chargement
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="p-4">
              <Skeleton className="h-4 w-full mb-2" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all"><Skeleton className="h-4 w-20" /></TabsTrigger>
          <TabsTrigger value="active"><Skeleton className="h-4 w-20" /></TabsTrigger>
          <TabsTrigger value="completed"><Skeleton className="h-4 w-20" /></TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

// Page principale des annonces pour les clients
export default async function ClientAnnouncementsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  
  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session?.user) {
    redirect("/login");
  }
  
  // Valeur par défaut pour l'onglet
  const defaultTab = searchParams.status || "all";
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Mes annonces</h2>
        <Link href="/client/announcements/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle annonce
          </Button>
        </Link>
      </div>
      
      <Suspense fallback={<LoadingSkeleton />}>
        <AnnouncementStatsCards userId={session.user.id} />
        
        <Tabs defaultValue={Array.isArray(defaultTab) ? defaultTab[0] : defaultTab}>
          <TabsList>
            <TabsTrigger value="all">
              <Boxes className="mr-2 h-4 w-4" />
              Toutes
            </TabsTrigger>
            <TabsTrigger value="active">
              <Clock className="mr-2 h-4 w-4" />
              En cours
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="mr-2 h-4 w-4" />
              Terminées
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              <XCircle className="mr-2 h-4 w-4" />
              Annulées
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <AnnouncementsList userId={session.user.id} />
          </TabsContent>
          
          <TabsContent value="active">
            <AnnouncementsList 
              userId={session.user.id} 
              status={["ACTIVE", "PENDING", "ASSIGNED", "IN_TRANSIT"]} 
            />
          </TabsContent>
          
          <TabsContent value="completed">
            <AnnouncementsList 
              userId={session.user.id} 
              status={["COMPLETED", "DELIVERED"]} 
            />
          </TabsContent>
          
          <TabsContent value="cancelled">
            <AnnouncementsList 
              userId={session.user.id} 
              status={["CANCELLED", "EXPIRED"]} 
            />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}