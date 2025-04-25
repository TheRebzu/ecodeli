import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 md:py-24">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="rounded-full bg-secondary p-5">
          <span className="text-5xl">🚚</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight">Page introuvable</h1>

        <p className="text-lg text-muted-foreground">
          Désolé, nous n&apos;avons pas pu trouver la page que vous recherchez.
          Elle a peut-être été déplacée ou supprimée.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/contact">Contactez-nous</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
