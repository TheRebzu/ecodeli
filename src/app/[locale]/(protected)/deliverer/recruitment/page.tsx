"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import DelivererRecruitmentSystem from "@/features/deliverer/components/recruitment/deliverer-recruitment-system";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, FileText } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function DelivererRecruitmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations("deliverer.recruitment");

  // Redirection automatique pour les livreurs validés
  useEffect(() => {
    if (user && user.role === 'DELIVERER' && 
        (user.validationStatus === 'VALIDATED' || user.validationStatus === 'APPROVED')) {
      // Délai de 3 secondes pour permettre à l'utilisateur de voir le message de redirection
      const timer = setTimeout(() => {
        router.push('/deliverer/opportunities');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {t("auth.required_title")}
          </h2>
          <p className="text-gray-600">{t("auth.required_description")}</p>
        </div>
      </div>
    );
  }

  // Affichage spécial pour les livreurs validés
  if (user.role === 'DELIVERER' && 
      (user.validationStatus === 'VALIDATED' || user.validationStatus === 'APPROVED')) {
    return (
      <div className="space-y-6">
        <PageHeader title="Compte Validé ✅" description="Votre candidature a été approuvée" />
        
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Félicitations ! Votre candidature est validée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-700">
              Votre profil de livreur a été approuvé. Vous êtes maintenant prêt à commencer vos livraisons !
            </p>
            <p className="text-sm text-green-600">
              Redirection automatique vers vos opportunités dans 3 secondes...
            </p>
            
            <div className="flex gap-3 pt-4">
              <Link href="/deliverer/opportunities">
                <Button className="bg-green-600 hover:bg-green-700">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Voir mes opportunités
                </Button>
              </Link>
              
              <Link href="/deliverer/documents">
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  <FileText className="h-4 w-4 mr-2" />
                  Consulter mes documents
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Affichage des informations de recrutement en lecture seule */}
        <div className="opacity-60">
          <DelivererRecruitmentSystem userId={user.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />

      <DelivererRecruitmentSystem userId={user.id} />
    </div>
  );
}
