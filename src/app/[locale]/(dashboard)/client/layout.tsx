import { Metadata } from "next";
import { ClientSidebar } from "@/components/dashboard/client/client-sidebar";

export const metadata: Metadata = {
  title: "Tableau de bord client",
  description: "Gérez vos livraisons et services en tant que client",
};

interface ClientLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export default async function ClientLayout({ 
  children,
  params 
}: ClientLayoutProps) {
  const { locale } = await params;
  
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <ClientSidebar />
        </aside>
        <main className="flex w-full flex-col overflow-hidden pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
