import { ReactNode, Suspense } from "react";
import { checkRoleAccess } from "@/lib/loaders/dashboard-loader";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Vérifier que l'utilisateur est authentifié
  // Le middleware doit déjà vérifier cela, mais c'est une sécurité supplémentaire
  const hasAccess = await checkRoleAccess([
    Role.CLIENT, 
    Role.MERCHANT, 
    Role.COURIER, 
    Role.PROVIDER, 
    Role.ADMIN
  ]);
  
  if (!hasAccess) {
    redirect('/login?callbackUrl=/dashboard');
  }
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
      </div>
      
      <Suspense fallback={<DashboardLoading />}>
        {children}
      </Suspense>
    </div>
  );
}

// Composant de chargement pour le dashboard
function DashboardLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-5 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  );
} 