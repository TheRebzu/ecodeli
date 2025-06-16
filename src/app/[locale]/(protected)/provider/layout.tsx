import React from "react";
import { ProtectedHeader } from "@/components/layout/protected/header";
import { ProtectedFooter } from "@/components/layout/protected/footer";
import { ProviderSidebar } from "@/components/layout/sidebars/provider-sidebar";

interface ProviderLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale }>;
}

export default async function ProviderLayout({
  children,
  params}: ProviderLayoutProps) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <ProtectedHeader locale={locale} />

      <div className="flex-1 flex">
        <div className="hidden md:block w-64 shrink-0">
          <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden">
            <ProviderSidebar locale={locale} />
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden bg-muted/10">
          <div className="container max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>

      <ProtectedFooter locale={locale} />
    </div>
  );
}
