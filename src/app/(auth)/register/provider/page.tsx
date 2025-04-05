import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription Prestataire | EcoDeli",
  description: "Inscrivez-vous en tant que prestataire pour offrir des services spécialisés à notre écosystème",
};

export default function ProviderRegisterPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12">Inscription Prestataire</h1>
        <p className="text-base sm:text-lg md:text-xl text-center text-muted-foreground mb-6 sm:mb-8 md:mb-12">
          Cette page est en cours de développement. Merci de revenir plus tard.
        </p>
      </div>
    </div>
  );
} 