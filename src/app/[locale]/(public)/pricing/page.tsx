import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/common';
import { ArrowRight, BadgeCheck, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-16 pb-20 max-w-screen-2xl mx-auto">
      {/* Hero Section */}
      <section className="relative w-full pt-16 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <Badge className="px-3 py-1 mb-2 inline-flex mx-auto">Tarifs</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Des formules simples pour tous les besoins
            </h1>
            <p className="text-xl text-muted-foreground">
              Choisissez la formule qui vous convient et profitez pleinement des services EcoDeli
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
                    name: 'Gratuit',
                    price: '0€',
                    period: 'pour toujours',
                    description: 'Découvrez EcoDeli sans engagement',
                    features: [
                      "Publication d'annonces (max 5)",
                      'Accès aux annonces disponibles',
                      'Messagerie avec les utilisateurs',
                      'Possibilité de devenir livreur',
                      'Assurance de base',
                      'Support par email',
                    ],
                    notIncluded: [
                      'Annonces prioritaires',
                      'Code de livraison illimité',
                      'Support client prioritaire',
                      "Système d'évaluation avancé",
                    ],
                    cta: 'Commencer gratuitement',
                    href: '/register',
                    popular: false,
                    color: '',
                  },
                  {
                    name: 'Starter',
                    price: '4,99€',
                    period: 'par mois',
                    description: 'Pour les utilisateurs réguliers',
                    features: [
                      "Publications d'annonces illimitées",
                      'Priorité dans les résultats de recherche',
                      'Assurance intermédiaire',
                      'Codes de livraison (10 par mois)',
                      'Support client prioritaire',
                      "Système d'évaluation avancé",
                      'Annonces prioritaires',
                    ],
                    notIncluded: ['Codes de livraison illimités', 'Assistance dédiée'],
                    cta: "S'abonner",
                    href: '/register?plan=starter',
                    popular: true,
                    color: 'border-primary',
                  },
                  {
                    name: 'Premium',
                    price: '9,99€',
                    period: 'par mois',
                    description: 'Pour une utilisation intensive',
                    features: [
                      "Publications d'annonces illimitées",
                      'Priorité maximum dans les résultats',
                      'Assurance premium',
                      'Codes de livraison illimités',
                      'Support téléphonique',
                      'Assistance dédiée',
                      'Statistiques avancées',
                      "Système d'évaluation complet",
                    ],
                    notIncluded: [],
                    cta: "S'abonner",
                    href: '/register?plan=premium',
                    popular: false,
                    color: '',
                  },
                ].map((plan, index) => (
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
            <Badge className="mb-4">Comparaison détaillée</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comparez toutes les fonctionnalités
            </h2>
            <p className="text-lg text-muted-foreground">
              Un aperçu complet de ce qui est inclus dans chaque formule
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-5xl mx-auto bg-background rounded-xl shadow-sm border">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th className="py-4 px-6 text-left font-medium w-1/3">Fonctionnalités</th>
                  <th className="py-4 px-4 text-center font-medium">Gratuit</th>
                  <th className="py-4 px-4 text-center font-medium bg-primary/5 border-y-2 border-primary">
                    Starter
                  </th>
                  <th className="py-4 px-4 text-center font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <FeatureRow
                  feature="Publications d'annonces"
                  values={['5 maximum', 'Illimitées', 'Illimitées']}
                />
                <FeatureRow
                  feature="Priorité dans les recherches"
                  values={['Standard', 'Élevée', 'Maximum']}
                />
                <FeatureRow feature="Assurance" values={['De base', 'Intermédiaire', 'Premium']} />
                <FeatureRow
                  feature="Codes de livraison"
                  values={['5 par mois', '10 par mois', 'Illimités']}
                />
                <FeatureRow
                  feature="Support client"
                  values={['Email', 'Prioritaire', 'Téléphonique']}
                />
                <FeatureRow
                  feature="Système d'évaluation"
                  values={['Basique', 'Avancé', 'Complet']}
                />
                <FeatureRow feature="Transport de colis" values={[true, true, true]} />
                <FeatureRow feature="Transport de personnes" values={[true, true, true]} />
                <FeatureRow feature="Services de courses" values={[true, true, true]} />
                <FeatureRow feature="Services écologiques" values={[true, true, true]} />
                <FeatureRow feature="Suivi en temps réel" values={[true, true, true]} />
                <FeatureRow
                  feature="Statistiques personnelles"
                  values={['Basiques', 'Avancées', 'Complètes']}
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
            <Badge className="mb-4">Questions fréquentes</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce que vous devez savoir sur nos formules
            </h2>
            <p className="text-lg text-muted-foreground">
              Les réponses aux questions les plus courantes concernant nos tarifs et abonnements
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                question: 'Puis-je changer de formule à tout moment ?',
                answer:
                  'Oui, vous pouvez changer de formule à tout moment depuis votre espace personnel. Le changement prendra effet à la prochaine période de facturation.',
              },
              {
                question: 'Comment fonctionne la formule gratuite ?',
                answer:
                  "La formule gratuite vous permet de publier jusqu'à 5 annonces par mois et d'accéder aux services de base d'EcoDeli sans aucun engagement ni frais cachés.",
              },
              {
                question: "Qu'est-ce qu'un code de livraison ?",
                answer:
                  "Les codes de livraison sont utilisés pour valider la réception d'un colis ou l'achèvement d'un service. Le destinataire doit confirmer en saisissant ce code, déclenchant ainsi le paiement du livreur.",
              },
              {
                question: 'Les formules incluent-elles tous les types de services ?',
                answer:
                  "Oui, toutes les formules donnent accès à l'ensemble des services proposés sur EcoDeli : transport de colis, transport de personnes, services de courses et services écologiques.",
              },
              {
                question: "Comment fonctionne l'assurance ?",
                answer:
                  'Chaque formule inclut une assurance qui couvre les colis ou services en cas de problème. Le niveau de couverture varie selon la formule choisie, avec une protection plus complète pour les formules supérieures.',
              },
              {
                question: 'Y a-t-il un engagement minimum ?',
                answer:
                  "Non, il n'y a aucun engagement minimum. Vous pouvez résilier votre abonnement à tout moment, la résiliation prendra effet à la fin de la période de facturation en cours.",
              },
            ].map((faq, index) => (
              <div key={index} className="p-6 rounded-xl border">
                <h3 className="font-bold text-lg mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section CTA */}
      <section className="w-full bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-background rounded-xl border shadow-sm p-8 md:p-12 text-center">
            <Badge className="mb-4">Prêt à commencer ?</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Rejoignez la communauté EcoDeli dès aujourd&apos;hui
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Que vous souhaitiez utiliser nos services ou devenir livreur, créez votre compte
              gratuitement et découvrez tous les avantages d&apos;EcoDeli.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Créer un compte gratuit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Nous contacter</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PricingCard({ plan }: { plan: any }) {
  return (
    <Card
      className={cn(
        'relative flex flex-col border-2 transition-all',
        plan.popular
          ? 'border-primary shadow-lg scale-[1.02]'
          : 'hover:border-primary/50 hover:shadow-md'
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
          {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
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
                <div key={index} className="flex items-start text-muted-foreground">
                  <XCircle className="h-5 w-5 text-muted-foreground/70 shrink-0 mr-2" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button asChild className="w-full group" variant={plan.popular ? 'default' : 'outline'}>
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
  values,
}: {
  feature: string;
  values: (string | boolean | number)[];
}) {
  return (
    <tr className="text-sm">
      <td className="py-4 px-6 font-medium">{feature}</td>
      {values.map((value, index) => (
        <td key={index} className={cn('py-4 px-4 text-center', index === 1 ? 'bg-primary/5' : '')}>
          {typeof value === 'boolean' ? (
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
