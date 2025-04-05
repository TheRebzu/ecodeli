import Link from "next/link";
import { auth } from "@/auth";
import { Truck, Package, Box, ChevronRight, Sparkles, ArrowUpRight } from "lucide-react";

import { RecentActivity } from "@/components/client/dashboard/recent-activity";
import { QuickActions } from "@/components/client/dashboard/quick-actions";

export const metadata = {
  title: "Tableau de bord | Espace Client",
  description: "Gérez vos livraisons, colis et services depuis votre espace client EcoDeli.",
};

export default async function ClientDashboardPage() {
  const session = await auth();
  const user = session?.user;
  
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Livraisons en cours</p>
              <p className="text-2xl font-bold mt-1">3</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href="/client/deliveries" 
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
            >
              Voir les détails
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Colis récents</p>
              <p className="text-2xl font-bold mt-1">8</p>
            </div>
            <div className="p-2 bg-emerald-100 rounded-full">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href="/client/packages" 
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
            >
              Voir l'historique
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Espace stockage</p>
              <p className="text-2xl font-bold mt-1">2/5</p>
            </div>
            <div className="p-2 bg-amber-100 rounded-full">
              <Box className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <Link 
              href="/client/storage" 
              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
            >
              Gérer mes espaces
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Quick actions and Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActions className="lg:col-span-2" />
        <RecentActivity className="lg:col-span-1" />
      </div>
      
      {/* Current subscription */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Standard</h3>
            <p className="opacity-90 mt-1">
              Votre abonnement actuel expire dans 23 jours
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link 
              href="/client/subscription/upgrade" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Passer à Premium
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 