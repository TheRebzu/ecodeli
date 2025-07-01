import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/common";
import { ArrowRight, BadgeCheck, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-16 pb-20 max-w-screen-2xl mx-auto">
      {/* Hero Section */}
      <section className="relative w-full pt-16 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <Badge className="px-3 py-1 mb-2 inline-flex mx-auto">{t('hero.badge', 'Tarifs')}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t('hero.title', 'Des formules simples pour tous les besoins')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('hero.subtitle', 'Choisissez la formule qui vous convient et profitez pleinement des services EcoDeli')}
            </p>
          </div>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 -translate-y-1/2 -left-32 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </section>

      {/* Section Forfaits */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-6xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    name: t('plans.free.name', 'Gratuit'),
                    price: t('plans.free.price', '0€'),
                    period: t('plans.free.period', 'pour toujours'),
                    description: t('plans.free.description', 'Découvrez EcoDeli sans engagement'),
                    features: [
                      t('plans.free.features.f1', "Publication d'annonces (max 5)"),
                      t('plans.free.features.f2', 'Accès aux annonces disponibles'),
                      t('plans.free.features.f3', 'Messagerie avec les utilisateurs'),
                      t('plans.free.features.f4', 'Possibilité de devenir livreur'),
                      t('plans.free.features.f5', 'Assurance de base'),
                      t('plans.free.features.f6', 'Support par email')],
                    notIncluded: [
                      t('plans.free.notIncluded.f1', 'Annonces prioritaires'),
                      t('plans.free.notIncluded.f2', 'Code de livraison illimité'),
                      t('plans.free.notIncluded.f3', 'Support client prioritaire'),
                      t('plans.free.notIncluded.f4', "Système d'évaluation avancé")],
                    cta: t('plans.free.cta', 'Commencer gratuitement'),
                    href: "/register",
                    popular: false,
                    color: ""},
                  {
                    name: t('plans.starter.name', 'Starter'),
                    price: t('plans.starter.price', '4,99€'),
                    period: t('plans.starter.period', 'par mois'),
                    description: t('plans.starter.description', 'Pour les utilisateurs réguliers'),
                    features: [
                      t('plans.starter.features.f1', "Publications d'annonces illimitées'),
                      t('plans.starter.features.f2', 'Priorité dans les résultats de recherche'),
                      t('plans.starter.features.f3', 'Assurance intermédiaire'),
                      t('plans.starter.features.f4', "Codes de livraison (10 par mois)"),
                      t('plans.starter.features.f5', 'Support client prioritaire'),
                      t('plans.starter.features.f6', "Système d'évaluation avancé"),
                      t('plans.starter.features.f7', 'Annonces prioritaires')],
                    notIncluded: [
                      t('plans.starter.notIncluded.f1', 'Codes de livraison illimités'),
                      t('plans.starter.notIncluded.f2', 'Assistance dédiée')],
                    cta: t('plans.starter.cta', "S'abonner"),
                    href: "/register?plan=starter",
                    popular: true,
                    color: "border-primary"},
                  {
                    name: t('plans.premium.name', 'Premium'),
                    price: t('plans.premium.price', '9,99€'),
                    period: t('plans.premium.period', 'par mois'),
                    description: t('plans.premium.description', 'Pour une utilisation intensive'),
                    features: [
                      t('plans.premium.features.f1', "Publications d'annonces illimitées'),
                      t('plans.premium.features.f2', 'Priorité maximum dans les résultats'),
                      t('plans.premium.features.f3', 'Assurance premium'),
                      t('plans.premium.features.f4', 'Codes de livraison illimités'),
                      t('plans.premium.features.f5', 'Support téléphonique'),
                      t('plans.premium.features.f6', 'Assistance dédiée'),
                      t('plans.premium.features.f7', 'Statistiques avancées'),
                      t('plans.premium.features.f8', "Système d'évaluation complet")],
                    notIncluded: [],
                    cta: t('plans.premium.cta', "S'abonner"),
                    href: "/register?plan=premium",
                    popular: false,
                    color: ""}].map((plan, index) => (
                  <PricingCard key={index} plan={plan} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités détaillées */}
      <section className="w-full bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">{t('comparison.badge', 'Comparaison détaillée')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('comparison.title', 'Comparez toutes les fonctionnalités')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('comparison.subtitle', 'Un aperçu complet de ce qui est inclus dans chaque formule')}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-5xl mx-auto bg-background rounded-xl shadow-sm border">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th className="py-4 px-6 text-left font-medium w-1/3">
                    {t('comparison.table.features', 'Fonctionnalités')}
                  </th>
                  <th className="py-4 px-4 text-center font-medium">{t('comparison.table.free', 'Gratuit')}</th>
                  <th className="py-4 px-4 text-center font-medium bg-primary/5 border-y-2 border-primary">
                    {t('comparison.table.starter', 'Starter')}
                  </th>
                  <th className="py-4 px-4 text-center font-medium">{t('comparison.table.premium', 'Premium')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <FeatureRow
                  feature={t('comparison.features.announcementPublications', "Publications d'annonces")}
                  values={[t('comparison.values.max5', "5 maximum"), t('comparison.values.unlimited', "Illimitées"), t('comparison.values.unlimited', "Illimitées")]}
                />
                <FeatureRow
                  feature={t('comparison.features.searchPriority', "Priorité dans les recherches")}
                  values={[t('comparison.values.standard', "Standard"), t('comparison.values.high', "Élevée"), t('comparison.values.maximum', "Maximum")]}
                />
                <FeatureRow
                  feature={t('comparison.features.insurance', "Assurance")}
                  values={[t('comparison.values.basic', "De base"), t('comparison.values.intermediate', "Intermédiaire"), t('comparison.values.premium', "Premium")]}
                />
                <FeatureRow
                  feature={t('comparison.features.deliveryCodes', "Codes de livraison")}
                  values={[t('comparison.values.5perMonth', "5 par mois"), t('comparison.values.10perMonth', "10 par mois"), t('comparison.values.unlimited', "Illimités")]}
                />
                <FeatureRow
                  feature={t('comparison.features.customerSupport', "Support client")}
                  values={[t('comparison.values.email', "Email"), t('comparison.values.priority', "Prioritaire"), t('comparison.values.phone', "Téléphonique")]}
                />
                <FeatureRow
                  feature={t('comparison.features.evaluationSystem', "Système d'évaluation")}
                  values={[t('comparison.values.basic', "Basique"), t('comparison.values.advanced', "Avancé"), t('comparison.values.complete', "Complet")]}
                />
                <FeatureRow
                  feature={t('comparison.features.parcelTransport', "Transport de colis")}
                  values={[true, true, true]}
                />
                <FeatureRow
                  feature={t('comparison.features.personTransport', "Transport de personnes")}
                  values={[true, true, true]}
                />
                <FeatureRow
                  feature={t('comparison.features.shoppingServices', "Services de courses")}
                  values={[true, true, true]}
                />
                <FeatureRow
                  feature={t('comparison.features.ecologicalServices', "Services écologiques")}
                  values={[true, true, true]}
                />
                <FeatureRow
                  feature={t('comparison.features.realTimeTracking', "Suivi en temps réel")}
                  values={[true, true, true]}
                />
                <FeatureRow
                  feature={t('comparison.features.personalStatistics', "Statistiques personnelles")}
                  values={[t('comparison.values.basic', "Basiques"), t('comparison.values.advanced', "Avancées"), t('comparison.values.complete', "Complètes")]}
                />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">{t('faq.badge', 'Questions fréquentes')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('faq.title', 'Tout ce que vous devez savoir sur nos formules')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('faq.subtitle', 'Les réponses aux questions les plus courantes concernant nos tarifs et abonnements')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                question: t('faq.q1.question', 'Puis-je changer de formule à tout moment ?'),
                answer:
                  t('faq.q1.answer', "Oui, vous pouvez changer de formule à tout moment depuis votre espace personnel. Le changement prendra effet à la prochaine période de facturation.")},
              {
                question: t('faq.q2.question', 'Comment fonctionne la formule gratuite ?'),
                answer:
                  t('faq.q2.answer', "La formule gratuite vous permet de publier jusqu'à 5 annonces par mois et d'accéder aux services de base d'EcoDeli sans aucun engagement ni frais cachés.")},
              {
                question: t('faq.q3.question', "Qu'est-ce qu'un code de livraison ?"),
                answer:
                  t('faq.q3.answer', "Les codes de livraison sont utilisés pour valider la réception d'un colis ou l'achèvement d'un service. Le destinataire doit confirmer en saisissant ce code, déclenchant ainsi le paiement du livreur.")},
              {
                question:
                    t('faq.q4.question', "Les formules incluent-elles tous les types de services ?"),
                answer:
                    t('faq.q4.answer', "Oui, toutes les formules donnent accès à l'ensemble des services proposés sur EcoDeli : transport de colis, transport de personnes, services de courses et services écologiques.")},
              {
                question: t('faq.q5.question', 'Comment fonctionne l'assurance ?'),
                answer:
                  t('faq.q5.answer', "Chaque formule inclut une assurance qui couvre les colis ou services en cas de problème. Le niveau de couverture varie selon la formule choisie, avec une protection plus complète pour les formules supérieures.")},
              {
                question: t('faq.q6.question', 'Y a-t-il un engagement minimum ?'),
                answer:
                  t('faq.q6.answer', "Non, il n'y a aucun engagement minimum. Vous pouvez résilier votre abonnement à tout moment, la résiliation prendra effet à la fin de la période de facturation en cours.")}]

      {/* Section CTA */}
      <section className="w-full bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-background rounded-xl border shadow-sm p-8 md:p-12 text-center">
            <Badge className="mb-4">{t('cta.badge', 'Prêt à commencer ?')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('cta.title', 'Rejoignez la communauté EcoDeli dès aujourd'hui')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              {t('cta.subtitle', "Que vous souhaitiez utiliser nos services ou devenir livreur, créez votre compte gratuitement et découvrez tous les avantages d'EcoDeli.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  {t('cta.createAccount', 'Créer un compte gratuit')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">{t('cta.contactUs', 'Nous contacter')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PricingCard({ plan }: { plan }) {
  return (
    <Card
      className={cn(
        "relative flex flex-col border-2 transition-all",
        plan.popular
          ? "border-primary shadow-lg scale-[1.02]"
          : "hover:border-primary/50 hover:shadow-md",
      )}
    >
      {plan.popular && (
        <div className="absolute -top-4 right-8 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
          Populaire
        </div>
      )}
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{plan.price}</span>
          {plan.period && (
            <span className="text-muted-foreground ml-1">{plan.period}</span>
          )}
        </div>
        <CardDescription className="mt-2">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <div className="space-y-2">
            {plan.features.map((feature: string, index: number) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          {plan.notIncluded && plan.notIncluded.length > 0 && (
            <div className="space-y-2">
              {plan.notIncluded.map((feature: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start text-muted-foreground"
                >
                  <XCircle className="h-5 w-5 text-muted-foreground/70 shrink-0 mr-2" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button
          asChild
          className="w-full group"
          variant={plan.popular ? "default" : "outline"}
        >
          <Link href={plan.href}>
            {plan.cta}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function FeatureRow({
  feature,
  values}: {
  feature: string;
  values: (string | boolean | number)[];
}) {
  return (
    <tr className="text-sm">
      <td className="py-4 px-6 font-medium">{feature}</td>
      {values.map((value, index) => (
        <td
          key={index}
          className={cn(
            "py-4 px-4 text-center",
            index === 1 ? "bg-primary/5" : "",
          )}
        >
          {typeof value === "boolean" ? (
            value ? (
              <CheckCircle className="h-5 w-5 text-primary mx-auto" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
            )
          ) : (
            value
          )}
        </td>
      ))}
    </tr>
  );
}
