import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  Box,
  Calendar,
  CheckCircle,
  Clock,
  CloudLightning,
  Forward,
  Leaf,
  Map,
  Package,
  Percent,
  Shield,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ShippingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="w-full bg-muted/30 pt-12 pb-24 md:pt-24 md:pb-32 border-b relative overflow-hidden"
          style={{
            backgroundImage: 'url(/images/shipping/pattern-bg.svg)',
            backgroundSize: 'cover',
          }}
        >
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2 space-y-6">
                <Badge className="mb-4">Services de livraison</Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  Le crowdshipping au service de tous
                </h1>
                <p className="text-xl text-muted-foreground">
                  Confiez vos colis à des livreurs indépendants qui se déplacent déjà dans votre
                  direction ou profitez de nos services à la personne
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button size="lg" asChild>
                    <Link href="/register">Déposer une annonce</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#services">Découvrir nos services</Link>
                  </Button>
                </div>
              </div>
              <div className="md:w-1/2 relative">
                <div className="aspect-square max-w-lg mx-auto">
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <Image
                      src="/images/shipping/hero-delivery.jpg"
                      alt="Livraison de colis EcoDeli"
                      className="object-cover"
                      width={600}
                      height={600}
                    />
                  </div>
                  <div className="absolute -bottom-6 -right-6 bg-background rounded-lg p-4 shadow-lg border">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-5 w-5 text-green-500" />
                      <p className="text-sm font-medium">Réduisez votre empreinte carbone</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="w-full py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
              <Badge>Nos services</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Une large gamme de services
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                EcoDeli vous propose bien plus que de la simple livraison de colis
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Package,
                  title: 'Transport de colis',
                  description:
                    'Livraison de vos colis par des particuliers qui se déplacent déjà dans votre direction. Prise en charge intégrale ou partielle du trajet selon vos besoins.',
                },
                {
                  icon: Users,
                  title: 'Transport de personnes',
                  description:
                    "Service de transport quotidien : accompagnement de personnes âgées chez un médecin, trajets vers le travail ou la gare, transferts aéroport au départ ou à l'arrivée.",
                },
                {
                  icon: ShoppingBag,
                  title: 'Courses et achats',
                  description:
                    "Faites réaliser vos courses par un livreur EcoDeli. Achat de produits spécifiques, même à l'étranger (produits introuvables chez vous).",
                },
                {
                  icon: Map,
                  title: 'Lâcher de chariot',
                  description:
                    "Faites vos achats chez un commerçant partenaire et profitez d'une livraison à domicile à l'adresse et au créneau horaire de votre choix.",
                },
                {
                  icon: Shield,
                  title: 'Services à la personne',
                  description:
                    "Garde d'animaux à domicile, petits travaux ménagers ou de jardinage pendant que vous êtes transporté(e) ailleurs.",
                },
                {
                  icon: Leaf,
                  title: 'Écologique et solidaire',
                  description:
                    "Réduction de l'impact environnemental des livraisons, pouvoir d'achat favorisé et lutte contre l'isolement social.",
                },
              ].map((service, index) => (
                <Card key={index} className="flex flex-col p-6 border bg-background">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{service.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{service.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Types de livraison */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
              <Badge>Services de livraison</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Nos options de transport de colis
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                Des solutions adaptées à chaque besoin d'expédition
              </p>
            </div>

            <Tabs defaultValue="standard" className="w-full max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="standard">Standard</TabsTrigger>
                <TabsTrigger value="express">Express</TabsTrigger>
                <TabsTrigger value="special">Spécial</TabsTrigger>
              </TabsList>

              <TabsContent value="standard" className="space-y-4">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="md:w-1/2">
                    <h3 className="text-2xl font-bold mb-4">Livraison Standard</h3>
                    <p className="text-muted-foreground mb-6">
                      Livraison économique et écologique. Vos colis sont livrés par des particuliers
                      qui effectuent déjà un trajet similaire.
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Annonce publiée sur notre plateforme',
                        'Suivi en temps réel',
                        'Assurance proposée par la société',
                        'Code de confirmation à la livraison',
                        'Paiement sécurisé',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-primary mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-6" asChild>
                      <Link href="/register">Déposer une annonce</Link>
                    </Button>
                  </div>
                  <div className="md:w-1/2">
                    <div className="rounded-xl overflow-hidden">
                      <Image
                        src="/images/shipping/standard-delivery.jpg"
                        alt="Livraison standard EcoDeli"
                        width={500}
                        height={350}
                        className="object-cover w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="express" className="space-y-4">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="md:w-1/2">
                    <h3 className="text-2xl font-bold mb-4">Distribution locale</h3>
                    <p className="text-muted-foreground mb-6">
                      Un livreur occasionnel se charge de distribuer vos marchandises aux
                      destinataires finaux dans une zone géographique définie.
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Livraison du dernier kilomètre',
                        'Idéal pour les commerçants locaux',
                        'Parfait pour les livraisons groupées',
                        'Notification aux destinataires',
                        'Confirmation de livraison en temps réel',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-primary mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-6" asChild>
                      <Link href="/register">Contacter un commercial</Link>
                    </Button>
                  </div>
                  <div className="md:w-1/2">
                    <div className="rounded-xl overflow-hidden">
                      <Image
                        src="/images/shipping/express-delivery.jpg"
                        alt="Distribution locale EcoDeli"
                        width={500}
                        height={350}
                        className="object-cover w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="special" className="space-y-4">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="md:w-1/2">
                    <h3 className="text-2xl font-bold mb-4">Stockage temporaire</h3>
                    <p className="text-muted-foreground mb-6">
                      Stockage temporaire de vos colis dans l'un de nos entrepôts avant la livraison
                      finale par l'un de nos livreurs.
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Disponible dans nos 6 entrepôts (Paris, Marseille, Lyon, Lille, Montpellier, Rennes)',
                        'Idéal pour les livraisons en plusieurs étapes',
                        'Sécurité garantie',
                        'Suivi en temps réel',
                        'Flexibilité maximale',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-primary mr-2" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-6" asChild>
                      <Link href="/register">En savoir plus</Link>
                    </Button>
                  </div>
                  <div className="md:w-1/2">
                    <div className="rounded-xl overflow-hidden">
                      <Image
                        src="/images/shipping/special-delivery.jpg"
                        alt="Stockage temporaire EcoDeli"
                        width={500}
                        height={350}
                        className="object-cover w-full h-auto"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="w-full py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
              <Badge>Le processus</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Comment déposer une annonce
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                Expédier un colis avec EcoDeli est simple, rapide et sécurisé
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  number: '01',
                  title: 'Publiez votre annonce',
                  description:
                    'Décrivez votre colis, indiquez les adresses de collecte et de livraison, et choisissez votre créneau horaire.',
                  icon: Box,
                },
                {
                  number: '02',
                  title: 'Un livreur accepte',
                  description:
                    'Notre système trouve le livreur idéal pour votre colis en fonction de son trajet prévu et de ses évaluations.',
                  icon: Truck,
                },
                {
                  number: '03',
                  title: 'Suivez en temps réel',
                  description:
                    'Recevez des notifications à chaque étape et suivez le parcours de votre colis sur une carte.',
                  icon: Forward,
                },
                {
                  number: '04',
                  title: 'Livraison confirmée',
                  description:
                    'Le destinataire communique un code au livreur pour confirmer la réception. Le paiement est alors débloqué.',
                  icon: Package,
                },
              ].map((step, index) => (
                <Card key={index} className="relative p-6 border bg-background">
                  <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {step.number}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-center mt-12">
              <Button size="lg" asChild>
                <Link href="/register">Déposer une annonce</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Formules d'abonnement */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
              <Badge>Abonnements</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Nos formules d'abonnement
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                Pour les particuliers qui utilisent régulièrement nos services
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="flex flex-col p-6 border bg-background h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold">Free</h3>
                  <p className="text-muted-foreground mt-2">Pour les utilisateurs occasionnels</p>
                  <div className="mt-4 text-3xl font-bold">0€</div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-muted-foreground mr-2 shrink-0 mt-0.5" />
                    <span>Accès aux services de base</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-muted-foreground mr-2 shrink-0 mt-0.5" />
                    <span>Dépôt d'annonces</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-muted-foreground mr-2 shrink-0 mt-0.5" />
                    <span>Envoi prioritaire (supplément 15%)</span>
                  </li>
                </ul>
                <Button variant="outline" size="lg" className="w-full mt-auto">
                  Commencer gratuitement
                </Button>
              </Card>

              <Card className="flex flex-col p-6 border bg-primary/5 border-primary/20 h-full">
                <div className="mb-6">
                  <Badge className="bg-primary/10 text-primary border-primary/30 mb-2">
                    Populaire
                  </Badge>
                  <h3 className="text-2xl font-bold">Starter</h3>
                  <p className="text-muted-foreground mt-2">Pour les utilisateurs réguliers</p>
                  <div className="mt-4 text-3xl font-bold">
                    9,90€
                    <span className="text-lg font-normal text-muted-foreground">/mois</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Assurance sur colis jusqu'à 115€/envoi</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Réduction de 5% sur l'envoi de colis</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Envoi prioritaire (supplément 5%)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Réduction de 5% sur les petits colis</span>
                  </li>
                </ul>
                <Button size="lg" className="w-full mt-auto">
                  Choisir Starter
                </Button>
              </Card>

              <Card className="flex flex-col p-6 border bg-background h-full">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold">Premium</h3>
                  <p className="text-muted-foreground mt-2">Pour une utilisation intensive</p>
                  <div className="mt-4 text-3xl font-bold">
                    19,99€
                    <span className="text-lg font-normal text-muted-foreground">/mois</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Assurance jusqu'à 3000€ par envoi</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Réduction de 9% sur tous les envois</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Premier envoi offert (jusqu'à 150€)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>3 envois prioritaires offerts par mois</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Réduction de 5% sur tous les colis</span>
                  </li>
                </ul>
                <Button variant="outline" size="lg" className="w-full mt-auto">
                  Choisir Premium
                </Button>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="w-full py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto bg-muted rounded-xl p-8 md:p-12 border shadow-sm">
              <div className="flex flex-col items-center text-center space-y-6">
                <Badge className="mb-4">Commencez maintenant</Badge>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                  Prêt à utiliser EcoDeli ?
                </h2>
                <p className="text-lg text-muted-foreground max-w-[700px]">
                  Inscrivez-vous gratuitement et découvrez tous nos services de livraison et à la
                  personne
                </p>
                <div className="flex gap-3 pt-4">
                  <Button size="lg" asChild>
                    <Link href="/register">
                      Créer un compte
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex items-center gap-8 mt-6 justify-center flex-wrap">
                  {[
                    {
                      icon: Package,
                      text: 'Livraison de colis',
                    },
                    {
                      icon: Users,
                      text: 'Services à la personne',
                    },
                    {
                      icon: Leaf,
                      text: 'Démarche écologique',
                    },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
