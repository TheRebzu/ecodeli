"use client";

import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useDashboardStats } from "@/hooks/client/useDashboardStats";
import { StatsCards } from "@/components/client/dashboard/StatsCards";
import { RecentActivity } from "@/components/client/dashboard/recent-activity";
import { QuickActions } from "@/components/client/dashboard/QuickActions";
import { SubscriptionCard } from "@/components/client/dashboard/SubscriptionCard";
import { TutorialButton } from '@/components/client/tutorial/tutorial-button'

export default function ClientDashboardPage() {
  const { data: session } = useSession();
  const { stats, isLoading, error } = useDashboardStats();
  
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {session?.user?.name?.split(' ')[0] || 'Utilisateur'}
          </h1>
          <p className="text-gray-500 mt-1">
            Voici un aperçu de vos activités et services en cours.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Link
            href="/client/announcements/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Créer une annonce
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </div>
      
      {/* Stats cards */}
      <StatsCards 
        activeDeliveries={stats?.activeDeliveries || 0}
        totalPackages={stats?.totalPackages || 0}
        storageBoxes={stats?.storageBoxes || 0}
        storageCapacity={stats?.storageCapacity || 5}
        isLoading={isLoading}
      />
      
      {/* Quick actions and Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions className="lg:col-span-2" />
        <RecentActivity 
          activities={stats?.recentActivity} 
          isLoading={isLoading}
          className="lg:col-span-1" 
        />
      </div>
      
      {/* Current subscription */}
      <SubscriptionCard 
        plan={stats?.subscription?.plan}
        remainingDays={stats?.subscription?.remainingDays}
        isLoading={isLoading}
      />
      
      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Une erreur est survenue</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            className="text-sm mt-2 text-red-700 hover:text-red-800 font-medium" 
            onClick={() => window.location.reload()}
          >
            Réessayer <ChevronRight className="h-3 w-3 inline-block ml-1" />
          </button>
        </div>
      )}

      <div className="flex items-center space-x-2 mt-4">
        <TutorialButton tooltip="Démarrer le guide d'utilisation" className="flex items-center gap-2 text-primary" variant="link" />
        <span className="text-sm text-muted-foreground">Nouveau ? Découvrez EcoDeli avec notre guide interactif</span>
      </div>
    </div>
  );
} 