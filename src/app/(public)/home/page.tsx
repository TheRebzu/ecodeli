import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, 
  ArrowRightLeft, 
  BadgeCheck, 
  Heart, 
  Leaf, 
  MapPin, 
  Package, 
  PiggyBank, 
  ShoppingBag, 
  Truck, 
  Users 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Section Hero */}
      <section className="relative w-full pt-16 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="px-3 py-1 mb-2">
                Nouveau en France
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                La livraison <span className="text-primary">collaborative</span> qui change tout
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                EcoDeli connecte particuliers, commerçants et prestataires pour des livraisons plus économiques, écologiques et humaines.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    S&apos;inscrire gratuitement
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Découvrir EcoDeli
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full border-2 border-background bg-slate-200"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Rejoignez +5000 utilisateurs satisfaits
                </p>
              </div>
            </div>
            <div className="relative h-[400px] lg:h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <Image
                    src="/placeholder-image.jpg"
                    alt="EcoDeli livraison collaborative"
                    width={500}
                    height={400}
                    className="rounded-lg shadow-lg mx-auto"
                    priority
                  />
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
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Simple & Rapide</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Comment fonctionne EcoDeli ?
            </h2>
            <p className="text-lg text-muted-foreground">
              Un système de livraison collaboratif en 3 étapes simples
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Package,
                title: "Déposez une annonce",
                description: "Publiez gratuitement votre besoin de livraison ou proposez votre trajet en tant que livreur.",
                color: "bg-primary/10",
                step: "01"
              },
              {
                icon: ArrowRightLeft,
                title: "Connectez-vous",
                description: "Trouvez un livreur disponible ou acceptez une mission qui correspond à votre trajet.",
                color: "bg-secondary/10",
                step: "02"
              },
              {
                icon: BadgeCheck,
                title: "Livraison assurée",
                description: "Suivez votre colis en temps réel. Le paiement est sécurisé et débloqué à la livraison.",
                color: "bg-blue-500/10",
                step: "03"
              },
            ].map((item, index) => (
              <Card key={index} className="relative overflow-hidden border-none shadow-md">
                <div className={cn("absolute right-0 top-0 w-24 h-24 flex items-center justify-center rounded-bl-xl", item.color)}>
                  <span className="text-xl font-bold opacity-50">{item.step}</span>
                </div>
                <CardHeader>
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", item.color)}>
                    <item.icon className="w-6 h-6" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="text-base">{item.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/faq">
              <Button variant="link" className="text-lg">
                En savoir plus sur le fonctionnement <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section Avantages */}
      <section className="bg-muted w-full">
        <div className="container py-16">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Pourquoi EcoDeli ?</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Des avantages pour tous
            </h2>
            <p className="text-lg text-muted-foreground">
              Une solution innovante avec de multiples bénéfices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: PiggyBank,
                title: "Économique",
                description: "Réduisez vos coûts de livraison jusqu'à 50% par rapport aux services traditionnels.",
                color: "text-green-500"
              },
              {
                icon: Leaf,
                title: "Écologique",
                description: "Diminuez l'impact environnemental en optimisant les trajets déjà existants.",
                color: "text-primary"
              },
              {
                icon: Heart,
                title: "Social",
                description: "Créez du lien social et luttez contre l'isolement grâce à nos services à la personne.",
                color: "text-red-500"
              },
              {
                icon: Users,
                title: "Collaboratif",
                description: "Participez à l'économie du partage et générez des revenus complémentaires.",
                color: "text-blue-500"
              },
              {
                icon: BadgeCheck,
                title: "Sécurisé",
                description: "Bénéficiez d'une assurance sur vos colis et d'un suivi en temps réel.",
                color: "text-amber-500"
              },
              {
                icon: Truck,
                title: "Flexible",
                description: "Des solutions adaptées à tous types de livraisons et de services.",
                color: "text-purple-500"
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-lg bg-background shadow-sm">
                <div className={cn("mt-1 text-muted-foreground", item.color)}>
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

      {/* Section Témoignages */}
      <section className="w-full py-16">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Témoignages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ce que nos utilisateurs disent
            </h2>
            <p className="text-lg text-muted-foreground">
              Découvrez les expériences de notre communauté grandissante
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marie L.",
                role: "Cliente régulière",
                content: "EcoDeli a changé ma façon de recevoir mes colis. C'est économique, écologique et j'ai rencontré des personnes formidables !",
                avatar: "/placeholder-avatar.jpg"
              },
              {
                name: "Thomas D.",
                role: "Livreur occasionnel",
                content: "Je fais mes trajets habituels tout en générant un revenu complémentaire. La plateforme est intuitive et les clients sont respectueux.",
                avatar: "/placeholder-avatar.jpg"
              },
              {
                name: "Sophie M.",
                role: "Commerçante partenaire",
                content: "Nous avons réduit nos coûts de livraison de 40% tout en offrant un service plus rapide à nos clients. Un vrai plus pour notre boutique !",
                avatar: "/placeholder-avatar.jpg"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-background p-6 rounded-xl shadow-sm border border-border/50 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden">
                    <Image 
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-muted-foreground italic">&ldquo;{testimonial.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Services supplémentaires */}
      <section className="w-full">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Nos Services</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Bien plus que de la livraison
            </h2>
            <p className="text-lg text-muted-foreground">
              EcoDeli propose une large gamme de services personnalisés
            </p>
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Truck,
                title: "Livraison de colis",
                description: "Transport de vos colis de toutes tailles, du simple document aux objets volumineux.",
                href: "/services/livraison",
                color: "border-primary/20 bg-primary/5"
              },
              {
                icon: Users,
                title: "Transport de personnes",
                description: "Accompagnement de personnes pour leurs déplacements quotidiens ou occasionnels.",
                href: "/services/transport",
                color: "border-blue-500/20 bg-blue-500/5"
              },
              {
                icon: ShoppingBag,
                title: "Service de courses",
                description: "Faites réaliser vos courses par un livreur qui vous les apporte directement.",
                href: "/services/courses",
                color: "border-amber-500/20 bg-amber-500/5"
              },
              {
                icon: MapPin,
                title: "Achats à l&apos;étranger",
                description: "Achetez des produits à l&apos;étranger grâce à nos livreurs en déplacement.",
                href: "/services/achats",
                color: "border-green-500/20 bg-green-500/5"
              },
            ].map((item, index) => (
              <Link key={index} href={item.href} className="block group">
                <div 
                  className={cn(
                    "h-full p-6 rounded-xl border-2 transition-all duration-300 hover:border-primary hover:shadow-lg hover:-translate-y-1",
                    item.color,
                    index === 0 ? "animate-fade-in" : "",
                    index === 1 ? "animate-fade-in animation-delay-500" : "",
                    index === 2 ? "animate-fade-in animation-delay-1000" : "",
                    index === 3 ? "animate-fade-in animation-delay-1500" : ""
                  )}
                >
                  <item.icon className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section Pricing */}
      <section className="w-full">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4">Nos Forfaits</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Des formules adaptées à vos besoins
            </h2>
            <p className="text-lg text-muted-foreground">
              Choisissez l&apos;offre qui vous convient le mieux
            </p>
          </div>
        </div>

        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Free",
                price: "0€",
                period: "pour toujours",
                description: "L&apos;essentiel pour débuter avec EcoDeli",
                features: [
                  "Dépôt d&apos;annonces",
                  "Recherche de livreurs",
                  "Messagerie avec les livreurs",
                  "Paiement sécurisé",
                ],
                cta: "Commencer gratuitement",
                href: "/register",
                popular: false,
              },
              {
                name: "Standard",
                price: "9,99€",
                period: "par mois",
                description: "Idéal pour les utilisateurs réguliers",
                features: [
                  "Tout ce qui est inclus dans Free",
                  "Annonces prioritaires",
                  "Assurance jusqu&apos;à 1000€",
                  "Support client prioritaire",
                  "Accès aux statistiques",
                ],
                cta: "S&apos;abonner",
                href: "/pricing/standard",
                popular: true,
              },
              {
                name: "Pro",
                price: "29,99€",
                period: "par mois",
                description: "Pour les professionnels et entreprises",
                features: [
                  "Tout ce qui est inclus dans Standard",
                  "API dédiée",
                  "Assurance jusqu&apos;à 5000€",
                  "Support dédié 24/7",
                  "Gestion multi-utilisateurs",
                  "Facturation automatique",
                ],
                cta: "Contacter l&apos;équipe commerciale",
                href: "/contact/sales",
                popular: false,
              },
            ].map((plan, index) => (
              <Card key={index} className={cn("flex flex-col h-full", plan.popular && "border-primary")}>
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-xs font-medium">
                    Recommandé
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-baseline gap-2">
                    <span>{plan.name}</span>
                    {plan.popular && <Badge variant="secondary" className="text-xs">Populaire</Badge>}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <BadgeCheck className="text-primary mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={plan.href} className="w-full">
                    <Button 
                      variant={plan.popular ? "default" : "outline"} 
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/pricing">
              <Button variant="link" className="text-lg">
                Comparer les offres en détail <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="w-full">
        <div className="container">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-secondary text-primary-foreground p-10 md:p-16 transform transition-all duration-500 hover:shadow-xl hover:scale-[1.01]">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in">
                Prêt à rejoindre la communauté EcoDeli ?
              </h2>
              <p className="text-xl opacity-90 mb-8">
                Inscrivez-vous gratuitement et commencez à profiter de tous les avantages du crowdshipping.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto transition-transform duration-300 hover:scale-105">
                    S&apos;inscrire gratuitement
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 hover:bg-primary-foreground/10 w-full sm:w-auto transition-transform duration-300 hover:scale-105">
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/20 to-transparent" />
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse-slow" />
            <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse-slow animation-delay-1000" />
          </div>
        </div>
      </section>
    </div>
  );
} 