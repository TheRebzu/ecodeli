import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="text-xl font-medium">Chargement en cours...</h2>
        <p className="text-sm text-muted-foreground">
          Veuillez patienter pendant que nous préparons votre contenu
        </p>
      </div>
    </div>
  );
}
