"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
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
              Choisissez la formule qui vous convient et profitez pleinement des
              services EcoDeli
            </p>
          </div>
        </div>
      </section>

      {/* Section Plans */}
      <section className="w-full">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Plan Gratuit */}
            <Card className="relative flex flex-col border-2 transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle>Gratuit</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">0€</span>
                  <span className="text-muted-foreground ml-1">
                    pour toujours
                  </span>
                </div>
                <CardDescription className="mt-2">
                  Découvrez EcoDeli sans engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Publications d'annonces (max 5)</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Accès aux annonces disponibles</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Messagerie avec les utilisateurs</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Assurance de base</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start text-muted-foreground">
                      <XCircle className="h-5 w-5 text-muted-foreground/70 shrink-0 mr-2" />
                      <span>Annonces prioritaires</span>
                    </div>
                    <div className="flex items-start text-muted-foreground">
                      <XCircle className="h-5 w-5 text-muted-foreground/70 shrink-0 mr-2" />
                      <span>Support client prioritaire</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4">
                <Button asChild className="w-full group" variant="outline">
                  <Link href="/register">
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Plan Starter */}
            <Card className="relative flex flex-col border-2 border-primary shadow-lg scale-[1.02] transition-all">
              <div className="absolute -top-4 right-8 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Populaire
              </div>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">9,90€</span>
                  <span className="text-muted-foreground ml-1">par mois</span>
                </div>
                <CardDescription className="mt-2">
                  Pour les utilisateurs réguliers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Publications d'annonces illimitées</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Priorité dans les résultats</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Assurance intermédiaire</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Support client prioritaire</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4">
                <Button asChild className="w-full group">
                  <Link href="/register?plan=starter">
                    S'abonner
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Plan Premium */}
            <Card className="relative flex flex-col border-2 transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle>Premium</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">19,99€</span>
                  <span className="text-muted-foreground ml-1">par mois</span>
                </div>
                <CardDescription className="mt-2">
                  Pour une utilisation intensive
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Publications d'annonces illimitées</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Priorité maximum</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Assurance premium</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Support téléphonique</span>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mr-2" />
                      <span>Statistiques avancées</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4">
                <Button asChild className="w-full group" variant="outline">
                  <Link href="/register?plan=premium">
                    S'abonner
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-background rounded-xl border shadow-sm p-8 md:p-12 text-center">
            <Badge className="mb-4">Prêt à commencer ?</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Rejoignez la communauté EcoDeli dès aujourd'hui
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Créez votre compte gratuitement et découvrez tous les avantages
              d'EcoDeli
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
