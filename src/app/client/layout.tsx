import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import ClientSidebar from "@/components/client/shared/client-sidebar";
import ClientHeader from "@/components/client/shared/client-header";
import ClientFooter from "@/components/client/shared/client-footer";

export const metadata = {
  title: "Espace Client | EcoDeli",
  description: "Gérez vos livraisons, colis et services depuis votre espace client EcoDeli.",
};

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated and has CLIENT role
  const session = await auth();
  
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/client");
  }
  
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center">Chargement...</div>}>
      <div className="min-h-screen flex flex-col">
        <ClientHeader userId={session.user.id} />
        
        <div className="flex-1 flex flex-col md:flex-row">
          <ClientSidebar userId={session.user.id} />
          
          <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        
        <ClientFooter />
      </div>
    </Suspense>
  );
} 