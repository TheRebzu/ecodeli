import { Loader2 } from "lucide-react";

export default function VerifyEmailLoading() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            Vérification de l&apos;adresse e-mail
          </h2>
          <p className="text-muted-foreground">
            Veuillez patienter pendant que nous vérifions votre adresse
            e-mail...
          </p>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}
