import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Coins,
  HandHeart,
  Leaf,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function BecomeDeliveryPage() {
  const t = useTranslations("public.becomeDelivery");
  
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="w-full bg-muted/30 pt-12 pb-24 md:pt-24 md:pb-32 border-b relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/2 space-y-6">
              <Badge className="mb-4">
                Devenez Livreur
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                Rejoignez la communauté des livreurs EcoDeli
              </h1>
              <p className="text-xl text-muted-foreground">
                Gagnez un revenu complémentaire tout en participant à une révolution écologique de la livraison
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" asChild>
                  <Link href="/register?as=courier">
                    S'inscrire comme livreur
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#avantages">
                    Découvrir les avantages
                  </Link>
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 relative">
              <div className="aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <Image
                    src="/images/become-delivery/hero-courier.jpg"
                    alt="Livreur EcoDeli à vélo"
                    className="object-cover"
                    width={600}
                    height={600}
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-background rounded-lg p-4 shadow-lg border">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <p className="text-sm font-medium">
                      Rejoignez notre réseau de livreurs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section id="avantages" className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
            <Badge>Les avantages</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
              Pourquoi devenir livreur EcoDeli ?
            </h2>
            <p className="text-muted-foreground max-w-[700px]">
              Profitez de nombreux avantages en rejoignant notre réseau de livreurs indépendants
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Coins,
                title: "Pouvoir d'achat",
                description: "Gagnez un revenu complémentaire en effectuant des livraisons. Vous choisissez les missions qui correspondent à votre emploi du temps.",
              },
              {
                icon: Clock,
                title: "Flexibilité totale",
                description: "Travaillez quand vous le souhaitez, sans engagement. Choisissez les livraisons qui correspondent à vos trajets habituels.",
              },
              {
                icon: Leaf,
                title: "Impact écologique",
                description: "Participez à la réduction de l'empreinte carbone des livraisons grâce à notre modèle de crowdshipping qui optimise les trajets existants.",
              },
            ].map((advantage, index) => (
              <Card key={index} className="flex flex-col p-6 border bg-background">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <advantage.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{advantage.title}</h3>
                </div>
                <p className="text-muted-foreground">{advantage.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto bg-muted rounded-xl p-8 md:p-12 border shadow-sm">
            <div className="flex flex-col items-center text-center space-y-6">
              <Badge className="mb-4">Rejoignez-nous</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Prêt à devenir livreur EcoDeli ?
              </h2>
              <p className="text-lg text-muted-foreground max-w-[700px]">
                Inscrivez-vous dès maintenant et commencez à gagner un revenu complémentaire tout en contribuant à un modèle de livraison plus durable
              </p>
              <div className="flex gap-3 pt-4">
                <Button size="lg" asChild>
                  <Link href="/register?as=courier">
                    S'inscrire comme livreur
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
