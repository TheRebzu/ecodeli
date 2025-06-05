import { Suspense } from 'react';
import { ClientDashboardWidgets } from '@/components/client/dashboard/client-dashboard';
import { Loader2 } from 'lucide-react';

export default function ClientDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Gérez vos annonces et livraisons</p>
      </div>
      
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <ClientDashboardWidgets />
      </Suspense>
    </div>
  );
}
