import { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  Leaf,
  Package,
  PiggyBank,
  ShoppingBag,
  Truck,
  Users,
  User,
  Sparkles,
  CheckCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function generateMetadata(): Metadata {
  return {
    title: 'Accueil | EcoDeli',
    description: 'Service de livraison collaboratif écologique',
  };
}

export default async function HomePage({ params }: { params: { locale: string } }) {
  // Await params and store locale in a constant to avoid dynamic API issues
  const locale = await Promise.resolve(params.locale);
  setRequestLocale(locale);

  // Log pour débogage
  console.log('PublicHomePage rendering in (public) group, locale:', locale);

  return (
    <div className="flex flex-col gap-20 pb-20 mx-auto max-w-screen-2xl scroll-smooth">
      {/* Section Hero */}
      <section className="relative w-full pt-16 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 text-center md:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 mx-auto lg:mx-0 max-w-xl">
              <Badge className="px-3 py-1 mb-2 mx-auto lg:mx-0 inline-flex">
                <Sparkles className="mr-1 h-3 w-3" /> Nouveau en France
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                La livraison <span>collaborative</span> qui change tout
              </h1>
              <div className="text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                EcoDeli connecte particuliers, commerçants et prestataires pour des livraisons
                <span className="mx-1 font-medium text-primary">plus écologiques</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href={`/${locale}/register`}>
                  <Button size="lg" className="w-full sm:w-auto group">
                    S&apos;inscrire gratuitement
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={`/${locale}/about`}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Découvrir EcoDeli
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 text-center p-4 rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm">
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary">+5000</p>
                  <p className="text-xs text-muted-foreground">Utilisateurs</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary">+15000</p>
                  <p className="text-xs text-muted-foreground">Livraisons</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary">-40%</p>
                  <p className="text-xs text-muted-foreground">Coûts réduits</p>
                </div>
              </div>
            </div>
            <div className="relative h-[400px] lg:h-[500px] mx-auto max-w-xl lg:max-w-none w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="relative w-full h-80 md:h-96 rounded-lg shadow-lg overflow-hidden">
                    <div className="absolute inset-0 bg-muted animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <Truck className="w-16 h-16 opacity-20" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 -translate-y-1/2 -left-32 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </section>

      {/* Section Comment ça marche */}
      <section className="w-full">
        <div className="container mx-auto px-4 text-center">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Simple & Rapide</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Comment fonctionne EcoDeli ?
            </h2>
            <p className="text-lg text-muted-foreground">
              Un système de livraison collaboratif en 4 étapes simples
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            {[
              {
                step: '1',
                title: 'Publiez votre annonce',
                description: 'Décrivez votre besoin de livraison ou le service que vous proposez',
                icon: Package,
              },
              {
                step: '2',
                title: "Mettez-vous d'accord",
                description: "Discutez des détails et du prix avec l'autre partie",
                icon: User,
              },
              {
                step: '3',
                title: 'Suivez en temps réel',
                description: 'Suivez le parcours du colis ou du livreur et communiquez si besoin',
                icon: Clock,
              },
              {
                step: '4',
                title: 'Code de confirmation',
                description: 'Un code de confirmation valide la livraison et déclenche le paiement',
                icon: CheckCircle,
              },
            ].map((step, index) => (
              <div key={index} className="w-full md:w-1/4 flex flex-col items-center text-center">
                <div className="mb-6 relative">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-primary/20">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 rotate-45">
                        <ArrowRight className="h-4 w-4 text-primary/40" />
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href={`/${locale}/faq`}>
              <Button variant="link" className="text-lg group">
                En savoir plus sur le fonctionnement{' '}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section Avantages */}
      <section className="bg-muted w-full">
        <div className="container py-16 mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Pourquoi EcoDeli ?</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Des avantages pour tous
            </h2>
            <p className="text-lg text-muted-foreground">
              Une solution innovante avec de multiples bénéfices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: PiggyBank,
                title: 'Économique',
                description:
                  "Réduisez vos coûts de livraison grâce à notre système d'annonces entre particuliers.",
                color: 'text-green-500',
              },
              {
                icon: Leaf,
                title: 'Écologique',
                description:
                  "Diminuez l'impact environnemental en optimisant les trajets déjà existants.",
                color: 'text-primary',
              },
              {
                icon: Heart,
                title: 'Social',
                description:
                  "Créez du lien social et luttez contre l'isolement grâce à nos services à la personne.",
                color: 'text-red-500',
              },
              {
                icon: Users,
                title: 'Collaboratif',
                description:
                  "Participez à l'économie du partage et générez des revenus complémentaires.",
                color: 'text-blue-500',
              },
              {
                icon: BadgeCheck,
                title: 'Sécurisé',
                description:
                  "Bénéficiez d'une assurance sur vos colis et d'un système de code de confirmation.",
                color: 'text-amber-500',
              },
              {
                icon: Truck,
                title: 'Flexible',
                description:
                  'Des solutions adaptées à tous types de services: transport de colis, personnes et plus.',
                color: 'text-purple-500',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-lg bg-background shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className={cn('mt-1 text-muted-foreground', item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Services */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Nos Services</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Des solutions pour tous vos besoins
            </h2>
            <p className="text-lg text-muted-foreground">
              EcoDeli propose une gamme complète de services de crowdshipping
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Package,
                title: 'Transport de colis',
                description:
                  'Livraison de colis de particuliers à particuliers avec prise en charge intégrale ou partielle du trajet.',
              },
              {
                icon: User,
                title: 'Transport de personnes',
                description:
                  "Accompagnez des personnes à leurs rendez-vous médicaux, à la gare ou à l'aéroport.",
              },
              {
                icon: ShoppingBag,
                title: 'Services de courses',
                description:
                  "Faites réaliser vos courses selon une liste établie, même pour des produits spécifiques à l'étranger.",
              },
              {
                icon: Heart,
                title: 'Services écologiques',
                description:
                  "Garde d'animaux, travaux ménagers ou de jardinage et autres services à la personne.",
              },
            ].map((service, index) => (
              <Card
                key={index}
                className="bg-background h-full transition-all duration-300 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <service.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/${locale}/services`}
                    className="text-primary hover:underline text-sm inline-flex items-center"
                  >
                    En savoir plus <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section Formules */}
      <section className="bg-muted/50 w-full py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Nos Formules</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Choisissez la formule adaptée à vos besoins
            </h2>
            <p className="text-lg text-muted-foreground">
              Du compte gratuit à la formule premium, trouvez l&apos;offre qui vous convient
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Free',
                price: '0€',
                period: 'pour toujours',
                description: "L'essentiel pour commencer",
                features: [
                  "Publication d'annonces limitée",
                  'Messagerie avec les utilisateurs',
                  'Système de paiement sécurisé',
                  'Commission standard sur les transactions',
                  'Support client par email',
                ],
                cta: 'Commencer gratuitement',
                popular: false,
              },
              {
                title: 'Starter',
                price: '9,99€',
                period: 'par mois',
                description: 'Pour les utilisateurs réguliers',
                features: [
                  "Publication d'annonces illimitée",
                  'Messagerie avec les utilisateurs',
                  'Système de paiement sécurisé',
                  'Commission réduite sur les transactions',
                  'Support client prioritaire',
                  'Mise en avant des annonces',
                ],
                cta: 'Choisir Starter',
                popular: true,
              },
              {
                title: 'Premium',
                price: '19,99€',
                period: 'par mois',
                description: 'Pour les professionnels',
                features: [
                  'Toutes les fonctionnalités Starter',
                  'Commission minimale sur les transactions',
                  "Outils d'analyse et de statistiques",
                  'Support client dédié',
                  'Doubles points de fidélité',
                  'Accès anticipé aux nouvelles fonctionnalités',
                ],
                cta: 'Choisir Premium',
                popular: false,
              },
            ].map((plan, index) => (
              <Card
                key={index}
                className={cn(
                  'relative overflow-hidden',
                  plan.popular ? 'border-primary shadow-lg' : ''
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-xs px-3 py-1 font-medium rotate-[45deg] translate-x-[30%] translate-y-[-10%]">
                      Populaire
                    </div>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">{plan.title}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm"> {plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant={plan.popular ? 'default' : 'outline'} className="w-full">
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section Témoignages */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Ils utilisent EcoDeli</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Ce que disent nos utilisateurs
            </h2>
            <p className="text-lg text-muted-foreground">
              Des expériences positives partagées par notre communauté
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: 'Sophie M.',
                role: 'Utilisatrice',
                comment:
                  "J'utilise régulièrement EcoDeli pour envoyer des colis à ma famille. C'est économique et je sais que je contribue à réduire l'impact environnemental. Le système de code de confirmation est vraiment sécurisant.",
              },
              {
                name: 'Thomas R.',
                role: 'Livreur',
                comment:
                  'Je fais des livraisons sur mes trajets quotidiens et ça me permet de gagner un revenu complémentaire tout en rendant service. La plateforme est simple à utiliser et le paiement est rapide.',
              },
              {
                name: 'Marie L.',
                role: 'Commerçante',
                comment:
                  "En tant que petite commerçante, EcoDeli m'a permis de proposer un service de livraison à mes clients sans investir dans une flotte de véhicules. Le système de lâcher de chariot est parfait pour mon activité.",
              },
            ].map((testimonial, index) => (
              <Card
                key={index}
                className="bg-background h-full transition-all duration-300 hover:shadow-md"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">&quot;{testimonial.comment}&quot;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-muted/30 rounded-xl p-8 md:p-12 border shadow-sm">
            <div className="flex flex-col items-center text-center space-y-6">
              <Badge className="mb-2">Rejoignez EcoDeli</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                Prêt à rejoindre la révolution du crowdshipping ?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Inscrivez-vous gratuitement et commencez à utiliser notre plateforme de livraison
                collaborative, économique et écologique.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={`/${locale}/register`}>
                  <Button size="lg" className="w-full sm:w-auto group">
                    S&apos;inscrire gratuitement
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={`/${locale}/become-delivery`}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Devenir livreur
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
