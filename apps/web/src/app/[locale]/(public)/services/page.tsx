import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/common';
import {
  ArrowRight,
  Bike,
  Box,
  CalendarClock,
  Clock,
  Check,
  CheckCircle,
  ClipboardEdit,
  Car,
  FileCheck,
  Globe,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  ShoppingBag,
  Truck,
  TruckIcon,
  UserCheck,
  Store,
  Heart,
  User,
  Shield,
  Leaf,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Accordion } from '@/components/ui/accordion';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <Badge className="px-3 py-1">Nos Services</Badge>
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Des solutions pour tous vos besoins
              </h1>
              <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                EcoDeli propose une gamme complète de services de crowdshipping pour particuliers et
                professionnels
              </p>
            </div>
          </div>
        </section>

        {/* Transport de colis */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 items-center">
              <div>
                <Badge className="mb-3">Service Principal</Badge>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl mb-4">
                  Transport de colis
                </h2>
                <p className="text-muted-foreground md:text-xl mb-6">
                  Notre service principal de crowdshipping vous permet de faire acheminer vos colis
                  de manière économique et écologique
                </p>
                <ul className="grid gap-4">
                  {[
                    'Livraison de colis de particuliers à particuliers',
                    'Prise en charge intégrale ou partielle du trajet',
                    'Livraison aux destinataires finaux',
                    'Suivi des colis en temps réel',
                    'Assurance incluse',
                    'Code de confirmation pour validation de livraison',
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex mt-8">
                  <Link href="/register">
                    <Button className="mr-4">
                      Commencer maintenant
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/shipping">
                    <Button variant="outline">En savoir plus</Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative w-full max-w-md aspect-square rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                  <Package className="h-24 w-24 text-primary/30" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Autres services */}
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <Badge className="px-3 py-1">Services additionnels</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Services à la personne
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Au-delà du transport de colis, nous proposons plusieurs services complémentaires
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {[
                {
                  icon: User,
                  title: 'Transport de personnes',
                  description:
                    'Transport quotidien pour rendez-vous médicaux, gare, aéroport, travail et autres déplacements.',
                  features: [
                    'Transferts aéroport',
                    'Accompagnement à des rendez-vous',
                    'Transports réguliers',
                    'Service ponctuel ou récurrent',
                  ],
                },
                {
                  icon: ShoppingBag,
                  title: 'Services de courses',
                  description:
                    'Nous effectuons vos courses selon vos besoins, même pour des produits spécifiques difficiles à trouver.',
                  features: [
                    'Courses selon liste fournie',
                    "Achats à l'étranger",
                    'Produits spécifiques',
                    'Livraison à domicile',
                  ],
                },
                {
                  icon: Heart,
                  title: 'Services écologiques',
                  description:
                    'Des services complémentaires pour répondre à tous vos besoins quotidiens.',
                  features: [
                    "Garde d'animaux à domicile",
                    'Petits travaux ménagers',
                    'Services de jardinage',
                    'Autres services personnalisés',
                  ],
                },
              ].map((service, index) => (
                <Card key={index} className="h-full transition-all duration-300 hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <service.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{service.description}</p>
                    <ul className="space-y-2">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Fonctionnement */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center mb-12">
              <Badge className="px-3 py-1">Processus</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Comment ça fonctionne
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Un processus simple en 4 étapes pour utiliser nos services
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              {[
                {
                  step: '01',
                  title: 'Publiez votre annonce',
                  description: 'Décrivez votre besoin de service ou le service que vous proposez',
                  icon: Package,
                },
                {
                  step: '02',
                  title: "Mettez-vous d'accord",
                  description: "Discutez des détails et du prix avec l'autre partie",
                  icon: User,
                },
                {
                  step: '03',
                  title: 'Suivez en temps réel',
                  description: 'Suivez le service en temps réel et communiquez si besoin',
                  icon: Clock,
                },
                {
                  step: '04',
                  title: 'Code de confirmation',
                  description: 'Un code de confirmation valide le service et déclenche le paiement',
                  icon: CheckCircle,
                },
              ].map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center p-6 rounded-lg">
                  <div className="mb-4 relative">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nos engagements */}
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center mb-12">
              <Badge className="px-3 py-1">Nos engagements</Badge>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Pourquoi choisir EcoDeli
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-xl">
                Nos valeurs et engagements pour un service de qualité
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Leaf,
                  title: 'Écologique',
                  description:
                    "Réduction de l'empreinte carbone grâce à l'optimisation des trajets existants.",
                },
                {
                  icon: Shield,
                  title: 'Sécurisé',
                  description:
                    'Transactions sécurisées, assurance incluse et système de code de confirmation.',
                },
                {
                  icon: Clock,
                  title: 'Flexible',
                  description: 'Des services adaptés à vos besoins, quand vous en avez besoin.',
                },
                {
                  icon: MapPin,
                  title: 'Local',
                  description:
                    "Soutien à l'économie locale et création de liens dans votre communauté.",
                },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="border-none bg-background h-full transition-all duration-300 hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-24 bg-background">
          <div className="container px-4 md:px-6">
            <div className="rounded-lg bg-muted p-8 md:p-10 lg:flex lg:items-center lg:justify-between">
              <div className="mb-5 lg:mb-0 lg:max-w-3xl">
                <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
                  Prêt à essayer EcoDeli ?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Rejoignez notre plateforme de crowdshipping et découvrez une nouvelle façon de
                  livrer et recevoir des services.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/register">
                  <Button className="w-full sm:w-auto">
                    S'inscrire gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
