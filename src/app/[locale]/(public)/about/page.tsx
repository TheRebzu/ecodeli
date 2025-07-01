import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/common";
import {
  ArrowRight,
  Award,
  Heart,
  Leaf,
  LucideIcon,
  Recycle,
  Shield,
  Users} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations('public.about');

  return (
    <div className="flex flex-col gap-16 pb-20 max-w-screen-2xl mx-auto">
      {/* Hero Section */}
      <section className="relative w-full pt-16 md:pt-24 lg:pt-32 overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <Badge className="px-3 py-1 mb-2 inline-flex mx-auto">
              {t('badge', 'À propos')}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t('title', 'Nous réinventons la livraison avec le crowdshipping')}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t('subtitle', "Découvrez EcoDeli, notre mission et notre vision d'une livraison plus écologique et économique")}
            </p>
          </div>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-48 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-3/4 -translate-y-1/2 -left-32 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </section>

      {/* Notre histoire */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <div className="relative aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <Image
                    src="/images/about/founding-team.jpg"
                    alt={t('foundingTeamAlt', "L'équipe d'EcoDeli")}
                    className="object-cover"
                    width={600}
                    height={600}
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-background rounded-lg p-4 shadow-lg border">
                  <p className="text-sm font-medium">
                    {t('concept', 'Le concept de crowdshipping')}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 space-y-6">
              <Badge>{t('conceptBadge', 'Notre concept')}</Badge>
              <h2 className="text-3xl font-bold">
                {t('conceptTitle', 'EcoDeli, une plateforme de crowdshipping innovante')}
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  {t('conceptDescription1', "EcoDeli est une plateforme de crowdshipping qui permet aux particuliers de confier leurs colis à d'autres particuliers pour des livraisons écologiques et économiques.")}
                </p>
                <p>
                  {t('conceptDescription2', "Notre concept repose sur l'optimisation des trajets existants : au lieu de créer de nouveaux déplacements, nous utilisons ceux que des personnes effectuent déjà pour transporter des colis ou proposer des services.")}
                </p>
                <p>
                  {t('conceptDescription3', "Cette approche permet de réduire l'empreinte carbone des livraisons, de générer des revenus complémentaires pour les livreurs, et d'offrir des tarifs plus avantageux aux utilisateurs.")}
                </p>
                <p>
                  {t('conceptDescription4', "Au-delà du transport de colis, notre plateforme propose également des services à la personne, tels que le transport de personnes, les courses, ou la garde d'animaux, toujours dans une logique d'optimisation des déplacements.")}
                </p>
              </div>
              <div className="pt-4">
                <Link href="/register">
                  <Button className="group">
                    {t('joinCommunity', 'Rejoindre la communauté')}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notre mission */}
      <section className="w-full bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4">{t('missionBadge', 'Notre mission')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              {t('missionTitle', 'Révolutionner la livraison grâce au crowdshipping')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('missionSubtitle', 'Notre mission est de créer un système de livraison plus écologique, économique et solidaire')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: Leaf,
                title: t('missionItems.reduceImpact.title', "Réduire l'impact environnemental"),
                description:
                  t('missionItems.reduceImpact.description', "En optimisant les trajets existants, nous contribuons à réduire les émissions de CO2 liées au transport de colis et de personnes.")},
              {
                icon: Users,
                title: t('missionItems.createPurchasingPower.title', "Créer du pouvoir d'achat"),
                description:
                  t('missionItems.createPurchasingPower.description', "Notre plateforme permet aux particuliers de générer des revenus complémentaires en proposant leurs services de livraison ou autres.")},
              {
                icon: Shield,
                title: t('missionItems.fightIsolation.title', "Lutter contre l'isolement"),
                description:
                  t('missionItems.fightIsolation.description', "Nos services favorisent les liens sociaux et contribuent à lutter contre l'isolement, notamment des personnes âgées ou à mobilité réduite.")},
              {
                icon: Recycle,
                title: t('missionItems.optimizeResources.title', 'Optimiser les ressources'),
                description:
                  t('missionItems.optimizeResources.description', "En utilisant les trajets existants, nous optimisons les ressources déjà en circulation plutôt que d'en ajouter de nouvelles.")},
              {
                icon: Award,
                title: t('missionItems.offerVariedServices.title', 'Proposer des services variés'),
                description:
                  t('missionItems.offerVariedServices.description', "Au-delà du transport de colis, nous proposons divers services à la personne pour répondre à tous les besoins.")},
              {
                icon: Heart,
                title: t('missionItems.supportLocalEconomy.title', "Soutenir l'économie locale"),
                description:
                  t('missionItems.supportLocalEconomy.description', "Notre système facilite les échanges locaux et aide les petits commerces à proposer des livraisons abordables.")}].map((item, index) => (
              <Card
                key={index}
                className="p-6 border hover:border-primary/50 transition-all"
              >
                <item.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Nos services */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4">{t('servicesBadge', 'Nos services')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('servicesTitle', 'Une gamme complète de services')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('servicesSubtitle', 'EcoDeli propose différents types de services pour répondre à tous vos besoins')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="bg-muted/30 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-4">{t('parcelTransport.title', 'Transport de colis')}</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('parcelTransport.item1', 'Livraison de colis de particuliers à particuliers')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('parcelTransport.item2', 'Prise en charge intégrale ou partielle du trajet')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('parcelTransport.item3', 'Livraison aux destinataires finaux')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('parcelTransport.item4', 'Suivi des colis en temps réel')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('parcelTransport.item5', 'Assurances pour les colis transportés')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('parcelTransport.item6', 'Système de validation par code de confirmation')}</span>
                </li>
              </ul>
            </div>

            <div className="bg-muted/30 rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-4">
                {t('personalServices.title', 'Services à la personne')}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>
                    {t('personalServices.item1', 'Transport de personnes (rendez-vous médicaux, gare, travail)')}
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('personalServices.item2', 'Transferts aéroport (départ ou arrivée)')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('personalServices.item3', 'Services de courses selon liste fournie')}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('personalServices.item4', "Achat de produits spécifiques, même à l'étranger")}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('personalServices.item5', "Garde d'animaux à domicile pendant un transport")}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-primary">•</span>
                  <span>{t('personalServices.item6', 'Petits travaux ménagers ou de jardinage')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Fonctionnement */}
      <section className="w-full bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge className="mb-4">{t('howItWorksBadge', 'Comment ça marche')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('howItWorksTitle', 'Un système simple et efficace')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('howItWorksSubtitle', 'Notre plateforme est conçue pour faciliter les échanges entre utilisateurs')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-12">
            {[
              {
                number: "01",
                title: t('howItWorksItems.publish.title', "Publication d'annonces"),
                description:
                  t('howItWorksItems.publish.description', "Les utilisateurs publient leurs besoins ou les services qu'ils proposent via notre système d'annonces.")},
              {
                number: "02",
                title: t('howItWorksItems.connect.title', 'Mise en relation'),
                description:
                  t('howItWorksItems.connect.description', "Notre plateforme met en relation les personnes ayant des besoins compatibles avec celles proposant des services.")},
              {
                number: "03",
                title: t('howItWorksItems.track.title', 'Suivi en temps réel'),
                description:
                  t('howItWorksItems.track.description', "Durant le service, un système de suivi en temps réel permet de savoir où en est la livraison ou le service.")},
              {
                number: "04",
                title: t('howItWorksItems.validate.title', 'Validation et paiement'),
                description:
                  t('howItWorksItems.validate.description', "Une fois le service effectué, un code de confirmation valide la livraison et déclenche le paiement.")}].map((step, index) => (
              <div
                key={index}
                className="relative p-6 bg-background rounded-xl border"
              >
                <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-muted rounded-xl p-8 md:p-12 border shadow-sm">
            <div className="flex flex-col items-center text-center space-y-6">
              <Badge className="mb-4">{t('cta.badge', 'Rejoignez-nous')}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                {t('cta.title', 'Prêt à essayer EcoDeli ?')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-[700px]">
                {t('cta.subtitle', "Que vous ayez besoin d'un service ou que vous souhaitiez en proposer, rejoignez notre communauté et découvrez les avantages du crowdshipping.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link href="/register">
                    {t('cta.register', "S'inscrire gratuitement")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/services">{t('cta.discoverServices', 'Découvrir nos services')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
