import { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
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
  Clock} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/common";
import { PageProps, MetadataProps } from "@/server/auth/next-auth";

export function generateMetadata(): Metadata {
  return {
    title: "Accueil | EcoDeli",
    description: "Service de livraison collaboratif écologique"};
}

export default async function HomePage({
  params}: {
  params: Promise<{ locale }>;
}) {
  // Locale est une valeur dynamique fournie par Next.js, on doit utiliser await
  const { locale } = await params;
  // Utiliser la fonction pour configurer la locale pour cette requête
  await setRequestLocale(locale);


  return (
    <div className="flex flex-col gap-20 pb-20 mx-auto max-w-screen-2xl scroll-smooth">
      {/* Section Hero */}
      <section className="relative w-full pt-16 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 text-center md:text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 mx-auto lg:mx-0 max-w-xl">
              <Badge className="px-3 py-1 mb-2 mx-auto lg:mx-0 inline-flex">
                <Sparkles className="mr-1 h-3 w-3" /> {t('hero.badge', 'Nouveau en France')}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                {t('hero.title', 'La livraison collaborative qui change tout')}
              </h1>
              <div className="text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0">
                {t('hero.subtitle', 'EcoDeli connecte particuliers, commerçants et prestataires pour des livraisons plus écologiques')}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href={`/${locale}/register`}>
                  <Button size="lg" className="w-full sm:w-auto group">
                    S&apos;inscrire gratuitement
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={`/${locale}/about`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Découvrir EcoDeli
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 text-center p-4 rounded-lg border border-border/30 bg-background/50 backdrop-blur-sm">
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary">+5000</p>
                  <p className="text-xs text-muted-foreground">{t('hero.stats.users', 'Utilisateurs')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary">+15000</p>
                  <p className="text-xs text-muted-foreground">{t('hero.stats.deliveries', 'Livraisons')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-primary">-40%</p>
                  <p className="text-xs text-muted-foreground">{t('hero.stats.costs', 'Coûts réduits')}</p>
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
            <Badge className="mb-4">{t('howItWorks.badge', 'Simple & Rapide')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {t('howItWorks.title', 'Comment fonctionne EcoDeli ?')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('howItWorks.subtitle', 'Un système de livraison collaboratif en 4 étapes simples')}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            {[
              {
                step: "1",
                title: t('howItWorks.steps.step1.title', 'Publiez votre annonce'),
                description:
                  t('howItWorks.steps.step1.description', "Décrivez votre besoin de livraison ou le service que vous proposez"),
                icon: Package},
              {
                step: "2",
                title: t('howItWorks.steps.step2.title', "Mettez-vous d'accord"),
                description:
                  t('howItWorks.steps.step2.description', "Discutez des détails et du prix avec l'autre partie"),
                icon: User},
              {
                step: "3",
                title: t('howItWorks.steps.step3.title', 'Suivez en temps réel'),
                description:
                  t('howItWorks.steps.step3.description', "Suivez le parcours du colis ou du livreur et communiquez si besoin"),
                icon: Clock},
              {
                step: "4",
                title: t('howItWorks.steps.step4.title', 'Code de confirmation'),
                description:
                  t('howItWorks.steps.step4.description', "Un code de confirmation valide la livraison et déclenche le paiement"),
                icon: CheckCircle}].map((step, index) => (
              <div
                key={index}
                className="w-full md:w-1/4 flex flex-col items-center text-center"
              >
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
                {t('howItWorks.learnMore', 'En savoir plus sur le fonctionnement')}{" "}
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
            <Badge className="mb-4">{t('advantages.badge', 'Pourquoi EcoDeli ?')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {t('advantages.title', 'Des avantages pour tous')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('advantages.subtitle', 'Une solution innovante avec de multiples bénéfices')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: PiggyBank,
                title: t('advantages.items.economical.title', 'Économique'),
                description:
                  t('advantages.items.economical.description', "Réduisez vos coûts de livraison grâce à notre système d'annonces entre particuliers."),
                color: "text-green-500"},
              {
                icon: Leaf,
                title: t('advantages.items.ecological.title', 'Écologique'),
                description:
                  t('advantages.items.ecological.description', "Diminuez l'impact environnemental en optimisant les trajets déjà existants."),
                color: "text-primary"},
              {
                icon: Heart,
                title: t('advantages.items.social.title', 'Social'),
                description:
                  t('advantages.items.social.description', "Créez du lien social et luttez contre l'isolement grâce à nos services à la personne."),
                color: "text-red-500"},
              {
                icon: Users,
                title: t('advantages.items.collaborative.title', 'Collaboratif'),
                description:
                  t('advantages.items.collaborative.description', "Participez à l'économie du partage et générez des revenus complémentaires."),
                color: "text-blue-500"},
              {
                icon: BadgeCheck,
                title: t('advantages.items.secure.title', 'Sécurisé'),
                description:
                  t('advantages.items.secure.description', "Bénéficiez d'une assurance sur vos colis et d'un système de code de confirmation."),
                color: "text-amber-500"},
              {
                icon: Truck,
                title: t('advantages.items.flexible.title', 'Flexible'),
                description:
                  t('advantages.items.flexible.description', "Des solutions adaptées à tous types de services: transport de colis, personnes et plus."),
                color: "text-purple-500"}].map((item, index) => (
              <div
                key={index}
                className="flex gap-4 p-4 rounded-lg bg-background shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className={cn("mt-1 text-muted-foreground", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
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
            <Badge className="mb-4">{t('services.badge', 'Nos Services')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {t('services.title', 'Des solutions pour tous vos besoins')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('services.subtitle', 'EcoDeli propose une gamme complète de services de crowdshipping')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Package,
                title: t('services.items.parcel.title', 'Transport de colis'),
                description:
                  t('services.items.parcel.description', "Livraison de colis de particuliers à particuliers avec prise en charge intégrale ou partielle du trajet."),},
              {
                icon: User,
                title: t('services.items.people.title', 'Transport de personnes'),
                description:
                  t('services.items.people.description', "Accompagnez des personnes à leurs rendez-vous médicaux, à la gare ou à l'aéroport."),},
              {
                icon: ShoppingBag,
                title: t('services.items.shopping.title', 'Services de courses'),
                description:
                  t('services.items.shopping.description', "Faites réaliser vos courses selon une liste établie, même pour des produits spécifiques à l'étranger."),},
              {
                icon: Heart,
                title: t('services.items.ecological.title', 'Services écologiques'),
                description:
                  t('services.items.ecological.description', "Garde d'animaux, travaux ménagers ou de jardinage et autres services à la personne.")}].map((service, index) => (
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
                    {t('services.learnMore', 'En savoir plus')} <ArrowRight className="ml-1 h-3 w-3" />
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
            <Badge className="mb-4">{t('plans.badge', 'Nos Formules')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {t('plans.title', 'Choisissez la formule adaptée à vos besoins')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('plans.subtitle', "Du compte gratuit à la formule premium, trouvez l'offre qui vous convient")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: t('plans.free.title', 'Free'),
                price: t('plans.free.price', '0€'),
                period: t('plans.free.period', 'pour toujours'),
                description: t('plans.free.description', "L'essentiel pour commencer'),
                features: [
                  t('plans.free.features.f1', "Publication d'annonces limitée'),
                  t('plans.free.features.f2', 'Messagerie avec les utilisateurs'),
                  t('plans.free.features.f3', 'Système de paiement sécurisé'),
                  t('plans.free.features.f4', 'Commission standard sur les transactions'),
                  t('plans.free.features.f5', 'Support client par email')],
                cta: t('plans.free.cta', 'Commencer gratuitement'),
                popular: false},
              {
                title: t('plans.starter.title', 'Starter'),
                price: t('plans.starter.price', '9,99€'),
                period: t('plans.starter.period', 'par mois'),
                description: t('plans.starter.description', 'Pour les utilisateurs réguliers'),
                features: [
                  t('plans.starter.features.f1', "Publication d'annonces illimitée'),
                  t('plans.starter.features.f2', 'Messagerie avec les utilisateurs'),
                  t('plans.starter.features.f3', 'Système de paiement sécurisé'),
                  t('plans.starter.features.f4', 'Commission réduite sur les transactions'),
                  t('plans.starter.features.f5', 'Support client prioritaire'),
                  t('plans.starter.features.f6', 'Mise en avant des annonces')],
                cta: t('plans.starter.cta', 'Choisir Starter'),
                popular: true},
              {
                title: t('plans.premium.title', 'Premium'),
                price: t('plans.premium.price', '19,99€'),
                period: t('plans.premium.period', 'par mois'),
                description: t('plans.premium.description', 'Pour les professionnels'),
                features: [
                  t('plans.premium.features.f1', 'Toutes les fonctionnalités Starter'),
                  t('plans.premium.features.f2', 'Commission minimale sur les transactions'),
                  t('plans.premium.features.f3', "Outils d'analyse et de statistiques"),
                  t('plans.premium.features.f4', 'Support client dédié'),
                  t('plans.premium.features.f5', 'Doubles points de fidélité'),
                  t('plans.premium.features.f6', 'Accès anticipé aux nouvelles fonctionnalités')],
                cta: t('plans.premium.cta', 'Choisir Premium'),
                popular: false}].map((plan, index) => (
              <Card
                key={index}
                className={cn(
                  "relative overflow-hidden",
                  plan.popular ? "border-primary shadow-lg" : "",
                )}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-xs px-3 py-1 font-medium rotate-[45deg] translate-x-[30%] translate-y-[-10%]">
                      {t('plans.popular', 'Populaire')}
                    </div>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {plan.title}
                  </CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">
                      {" "}
                      {plan.period}
                    </span>
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
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                  >
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
            <Badge className="mb-4">{t('testimonials.badge', 'Ils utilisent EcoDeli')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {t('testimonials.title', 'Ce que disent nos utilisateurs')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('testimonials.subtitle', 'Des expériences positives partagées par notre communauté')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Sophie M.",
                role: t('testimonials.user1.role', 'Utilisatrice'),
                comment:
                  t('testimonials.user1.comment', "J'utilise régulièrement EcoDeli pour envoyer des colis à ma famille. C'est économique et je sais que je contribue à réduire l'impact environnemental. Le système de code de confirmation est vraiment sécurisant.")},,
              {
                name: "Thomas R.",
                role: t('testimonials.user2.role', 'Livreur'),
                comment:
                  t('testimonials.user2.comment', "Je fais des livraisons sur mes trajets quotidiens et ça me permet de gagner un revenu complémentaire tout en rendant service. La plateforme est simple à utiliser et le paiement est rapide.")},
              {
                name: "Marie L.",
                role: t('testimonials.user3.role', 'Commerçante'),
                comment:
                  t('testimonials.user3.comment', "En tant que petite commerçante, EcoDeli m'a permis de proposer un service de livraison à mes clients sans investir dans une flotte de véhicules. Le système de lâcher de chariot est parfait pour mon activité.")}}}]
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
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    &quot;{testimonial.comment}&quot;
                  </p>
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
              <Badge className="mb-2">{t('cta.badge', 'Rejoignez EcoDeli')}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                {t('cta.title', 'Prêt à rejoindre la révolution du crowdshipping ?')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {t('cta.subtitle', 'Inscrivez-vous gratuitement et commencez à utiliser notre plateforme de livraison collaborative, économique et écologique.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={`/${locale}/register`}>
                  <Button size="lg" className="w-full sm:w-auto group">
                    S&apos;inscrire gratuitement
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href={`/${locale}/become-delivery`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {t('cta.buttons.becomeCourier', 'Devenir livreur')}
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
