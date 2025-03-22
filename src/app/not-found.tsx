"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-10">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mb-6">
          <Search className="h-20 w-20 text-muted-foreground mx-auto mb-2" />
          <h2 className="text-4xl font-bold">404</h2>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Page introuvable</h2>
          <p className="text-muted-foreground">
            Désolé, la page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
