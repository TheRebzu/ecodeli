import { Suspense } from 'react';
import { ClientDashboardWidgets } from '@/components/dashboard/role-specific/client-dashboard-widgets';
import { Loader2 } from 'lucide-react';

export default function ClientDashboardPage() {
  return (
    <div className="container py-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        }
      >
        <ClientDashboardWidgets />
      </Suspense>
    </div>
  );
}
