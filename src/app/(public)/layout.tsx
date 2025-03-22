import React from "react";
import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 sm:px-6 py-8">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
