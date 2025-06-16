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
  Users} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function BecomeDeliveryPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section
          className="w-full bg-muted/30 pt-12 pb-24 md:pt-24 md:pb-32 border-b relative overflow-hidden"
          style={{
            backgroundImage: "url(/images/become-delivery/pattern-bg.svg)",
            backgroundSize: "cover"}}
        >
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2 space-y-6">
                <Badge className="mb-4">Devenez Livreur</Badge>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  Rejoignez la communauté des livreurs EcoDeli
                </h1>
                <p className="text-xl text-muted-foreground">
                  Gagnez un revenu complémentaire tout en participant à une
                  révolution écologique de la livraison
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button size="lg" asChild>
                    <Link href="/register?as=courier">
                      S&apos;inscrire comme livreur
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="#avantages">Découvrir les avantages</Link>
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
                Profitez de nombreux avantages en rejoignant notre réseau de
                livreurs indépendants
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Coins,
                  title: "Pouvoir d'achat",
                  description:
                    "Gagnez un revenu complémentaire en effectuant des livraisons. Vous choisissez les missions qui correspondent à votre emploi du temps."},
                {
                  icon: Clock,
                  title: "Flexibilité totale",
                  description:
                    "Travaillez quand vous le souhaitez, sans engagement. Choisissez les livraisons qui correspondent à vos trajets habituels."},
                {
                  icon: Leaf,
                  title: "Impact écologique",
                  description:
                    "Participez à la réduction de l'empreinte carbone des livraisons grâce à notre modèle de crowdshipping qui optimise les trajets existants."},
                {
                  icon: ShieldCheck,
                  title: "Sécurité assurée",
                  description:
                    "Tous les colis sont assurés par notre société. Vous êtes protégés pendant vos missions de livraison."},
                {
                  icon: Users,
                  title: "Lutte contre l'isolement",
                  description:
                    "Contribuez à créer du lien social en livrant des personnes isolées ou à mobilité réduite. Développez des relations humaines dans votre quartier."},
                {
                  icon: HandHeart,
                  title: "Services variés",
                  description:
                    "Au-delà des colis, proposez des services comme le transport de personnes, les courses, ou même la garde d'animaux pendant que vous transportez le propriétaire."}].map((advantage, index) => (
                <Card
                  key={index}
                  className="flex flex-col p-6 border bg-background"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-primary/10 p-3 rounded-lg">
                      <advantage.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{advantage.title}</h3>
                  </div>
                  <p className="text-muted-foreground">
                    {advantage.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
              <Badge>Le processus</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Comment devenir livreur
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                Un processus simple pour commencer à livrer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  number: "01",
                  title: "Inscription",
                  description:
                    "Créez votre compte sur notre site et complétez votre profil avec vos informations personnelles."},
                {
                  number: "02",
                  title: "Vérification",
                  description:
                    "Fournissez les pièces justificatives demandées pour la validation de votre compte par EcoDeli."},
                {
                  number: "03",
                  title: "Annonces",
                  description:
                    "Consultez les annonces disponibles ou indiquez à l'avance les trajets que vous allez effectuer."},
                {
                  number: "04",
                  title: "Livraison et paiement",
                  description:
                    "Effectuez la livraison, faites confirmer la réception avec un code, et recevez votre paiement immédiatement."}].map((step, index) => (
                <Card key={index} className="relative p-6 border bg-background">
                  <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </Card>
              ))}
            </div>

            <div className="flex justify-center mt-12">
              <Button size="lg" asChild>
                <Link href="/register?as=courier">
                  Devenir livreur maintenant
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Types de services */}
        <section className="w-full py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
              <Badge>Nos services</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Des missions variées pour tous les profils
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                En tant que livreur EcoDeli, vous pouvez proposer différents
                types de services
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: "Transport de colis",
                  features: [
                    "Livraison de colis de particuliers à particuliers",
                    "Prise en charge intégrale ou partielle du trajet",
                    "Livraison aux destinataires finaux",
                    "Suivi en temps réel",
                    "Validation par code de confirmation"]},
                {
                  title: "Services à la personne",
                  features: [
                    "Transport quotidien de personnes (rdv médicaux, gare, travail)",
                    "Transferts aéroport (départ ou arrivée)",
                    "Courses et achats selon liste fournie",
                    "Achat de produits spécifiques, même à l'étranger",
                    "Garde d'animaux à domicile pendant un transport",
                    "Petits travaux ménagers ou de jardinage"]}].map((service, index) => (
                <Card key={index} className="p-6 border bg-background">
                  <h3 className="text-xl font-semibold mb-4">
                    {service.title}
                  </h3>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Paiement */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-12">
              <Badge>Paiement</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                Comment êtes-vous payé ?
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                Un système de paiement simple et sécurisé
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Card className="p-8 border bg-background">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      <span className="text-primary font-bold">1</span>
                    </div>
                    <p>
                      Vous vous mettez d'accord avec l'expéditeur sur le prix et
                      la date de la livraison.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      <span className="text-primary font-bold">2</span>
                    </div>
                    <p>
                      Le client paie sur EcoDeli. L'argent est conservé jusqu'à
                      la livraison.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      <span className="text-primary font-bold">3</span>
                    </div>
                    <p>
                      Le jour de la livraison, le destinataire communique un
                      code. Vous validez la livraison en saisissant ce code sur
                      la page de discussion ou l'annonceur confirme la livraison
                      directement depuis son compte EcoDeli.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      <span className="text-primary font-bold">4</span>
                    </div>
                    <p>
                      L'argent est immédiatement disponible dans votre
                      portefeuille EcoDeli. Le paiement se trouve dans la
                      rubrique "Mes paiements" de votre compte.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-primary/10 p-2 rounded-full mr-4">
                      <span className="text-primary font-bold">5</span>
                    </div>
                    <p>
                      Vous pouvez demander un virement sur votre compte bancaire
                      à tout moment.
                    </p>
                  </div>
                </div>
              </Card>
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
                  Inscrivez-vous dès maintenant et commencez à gagner un revenu
                  complémentaire tout en contribuant à un modèle de livraison
                  plus durable
                </p>
                <div className="flex gap-3 pt-4">
                  <Button size="lg" asChild>
                    <Link href="/register?as=courier">
                      S&apos;inscrire comme livreur
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
