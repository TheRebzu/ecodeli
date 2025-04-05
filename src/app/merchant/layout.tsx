import React from "react";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-700 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Espace Commerçant</h1>
        </div>
      </header>
      
      <div className="flex flex-1">
        <aside className="w-64 bg-gray-100 p-4">
          <nav className="space-y-2">
            <a href="/merchant/dashboard" className="block p-2 hover:bg-gray-200 rounded">
              Tableau de bord
            </a>
            <a href="/merchant/products" className="block p-2 hover:bg-gray-200 rounded">
              Produits
            </a>
            <a href="/merchant/categories" className="block p-2 hover:bg-gray-200 rounded">
              Catégories
            </a>
            <a href="/merchant/orders" className="block p-2 hover:bg-gray-200 rounded">
              Commandes
            </a>
            <a href="/merchant/store" className="block p-2 hover:bg-gray-200 rounded">
              Ma boutique
            </a>
            <a href="/merchant/promotions" className="block p-2 hover:bg-gray-200 rounded">
              Promotions
            </a>
            <a href="/merchant/analytics" className="block p-2 hover:bg-gray-200 rounded">
              Analyses
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