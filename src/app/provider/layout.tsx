import React from "react";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-purple-700 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Espace Prestataire</h1>
        </div>
      </header>
      
      <div className="flex flex-1">
        <aside className="w-64 bg-gray-100 p-4">
          <nav className="space-y-2">
            <a href="/provider/dashboard" className="block p-2 hover:bg-gray-200 rounded">
              Tableau de bord
            </a>
            <a href="/provider/services" className="block p-2 hover:bg-gray-200 rounded">
              Services
            </a>
            <a href="/provider/requests" className="block p-2 hover:bg-gray-200 rounded">
              Demandes
            </a>
            <a href="/provider/schedule" className="block p-2 hover:bg-gray-200 rounded">
              Planning
            </a>
            <a href="/provider/earnings" className="block p-2 hover:bg-gray-200 rounded">
              Revenus
            </a>
            <a href="/provider/profile" className="block p-2 hover:bg-gray-200 rounded">
              Mon profil
            </a>
            <a href="/provider/settings" className="block p-2 hover:bg-gray-200 rounded">
              Paramètres
            </a>
          </nav>
        </aside>
        
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
} 