"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Leaf, Package, Users, Shield, Star, Quote, MapPin, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeToggle } from "@/components/mode-toggle"
import { CheckoutButton } from "@/components/checkout-button"
import { PlaceholderImage } from "@/components/ui/placeholder-image"

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const testimonials = [
    {
      name: "Marie L.",
      role: "Cliente régulière",
      content: "EcoDeli a révolutionné ma façon d'envoyer des colis. C'est économique et écologique !",
      rating: 5,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      name: "Thomas B.",
      role: "Livreur",
      content: "Je gagne un complément de revenu tout en contribuant à réduire l'impact environnemental.",
      rating: 5,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      name: "Sophie M.",
      role: "Commerçante",
      content: "Une solution innovante qui m'aide à développer mon activité de manière responsable.",
      rating: 5,
      image: "/placeholder.svg?height=100&width=100",
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-ecodeli-50 to-background dark:from-ecodeli-900 dark:to-background">
      {/* Navigation avec effet de fond au scroll et mode sombre */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "bg-background/80 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Leaf className="h-6 w-6 text-ecodeli-600 dark:text-ecodeli-400" />
            <span className="text-xl font-bold text-ecodeli-800 dark:text-ecodeli-200">EcoDeli</span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link
              href="/about"
              className="text-sm font-medium text-ecodeli-600 hover:text-ecodeli-800 transition-colors dark:text-ecodeli-400 dark:hover:text-ecodeli-200"
            >
              À propos
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-ecodeli-600 hover:text-ecodeli-800 transition-colors dark:text-ecodeli-400 dark:hover:text-ecodeli-200"
            >
              Contact
            </Link>
            <Button asChild variant="ghost" className="transition-all hover:scale-105">
              <Link href="/auth/signin">Connexion</Link>
            </Button>
            <Button
              asChild
              className="transition-all hover:scale-105 bg-ecodeli-600 text-white hover:bg-ecodeli-700 dark:bg-ecodeli-500 dark:hover:bg-ecodeli-600"
            >
              <Link href="/auth/signup">Inscription</Link>
            </Button>
            <ModeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section améliorée */}
        <section className="relative px-4 py-20 md:py-32 lg:py-40 overflow-hidden bg-gradient-to-br from-ecodeli-100 to-ecodeli-200 dark:from-ecodeli-800 dark:to-ecodeli-900">
          <div className="container relative flex flex-col items-center text-center space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge
                variant="outline"
                className="bg-white text-ecodeli-800 mb-4 dark:bg-ecodeli-800 dark:text-ecodeli-200"
              >
                Nouveau : Livraison écologique et économique
              </Badge>
            </motion.div>
            <motion.h1
              className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-ecodeli-900 dark:text-ecodeli-100"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              La livraison réinventée
            </motion.h1>
            <motion.p
              className="mx-auto max-w-[700px] text-ecodeli-700 md:text-xl dark:text-ecodeli-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Rejoignez la communauté EcoDeli et participez à une nouvelle façon de livrer, plus écologique et
              économique.
            </motion.p>
            <motion.div
              className="space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Button
                asChild
                size="lg"
                className="transition-all hover:scale-105 bg-ecodeli-600 text-white hover:bg-ecodeli-700 dark:bg-ecodeli-500 dark:hover:bg-ecodeli-600"
              >
                <Link href="/auth/signup">
                  Commencer maintenant <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="transition-all hover:scale-105 border-ecodeli-600 text-ecodeli-600 hover:bg-ecodeli-100 dark:border-ecodeli-400 dark:text-ecodeli-400 dark:hover:bg-ecodeli-800"
              >
                En savoir plus
              </Button>
            </motion.div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 w-full max-w-4xl">
              {[
                { label: "Utilisateurs actifs", value: "10K+" },
                { label: "Livraisons réussies", value: "50K+" },
                { label: "Satisfaction client", value: "98%" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center p-6 bg-white rounded-lg shadow-lg dark:bg-ecodeli-800"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                >
                  <div className="text-3xl font-bold text-ecodeli-600 mb-2 dark:text-ecodeli-300">{stat.value}</div>
                  <div className="text-sm text-ecodeli-700 dark:text-ecodeli-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section Comment ça marche avec Tabs */}
        <section className="container py-20">
          <h2 className="text-3xl font-bold tracking-tighter text-center mb-12 text-ecodeli-900 dark:text-ecodeli-100">
            Comment ça marche ?
          </h2>
          <Tabs defaultValue="sender" className="max-w-3xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="sender" className="text-lg text-ecodeli-800 dark:text-ecodeli-200">
                Je veux envoyer
              </TabsTrigger>
              <TabsTrigger value="courier" className="text-lg text-ecodeli-800 dark:text-ecodeli-200">
                Je veux livrer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sender" className="mt-6 space-y-6">
              <div className="grid gap-6">
                {[
                  {
                    title: "1. Publiez votre annonce",
                    description: "Décrivez votre colis et indiquez les points de collecte et de livraison.",
                  },
                  {
                    title: "2. Choisissez un livreur",
                    description:
                      "Sélectionnez parmi les livreurs disponibles celui qui correspond le mieux à vos besoins.",
                  },
                  {
                    title: "3. Suivez votre livraison",
                    description: "Suivez en temps réel l'avancement de votre livraison et recevez des notifications.",
                  },
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md dark:bg-ecodeli-800"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-ecodeli-500 text-white flex items-center justify-center flex-shrink-0 text-lg font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-ecodeli-800 mb-2 dark:text-ecodeli-200">
                        {step.title}
                      </h3>
                      <p className="text-ecodeli-600 dark:text-ecodeli-400">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="courier" className="mt-6 space-y-6">
              <div className="grid gap-6">
                {[
                  {
                    title: "1. Créez votre profil",
                    description: "Inscrivez-vous comme livreur et complétez votre profil avec vos documents.",
                  },
                  {
                    title: "2. Trouvez des livraisons",
                    description: "Parcourez les annonces correspondant à vos trajets habituels.",
                  },
                  {
                    title: "3. Gagnez de l'argent",
                    description: "Effectuez les livraisons et recevez votre paiement de manière sécurisée.",
                  },
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md dark:bg-ecodeli-800"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-ecodeli-500 text-white flex items-center justify-center flex-shrink-0 text-lg font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-ecodeli-800 mb-2 dark:text-ecodeli-200">
                        {step.title}
                      </h3>
                      <p className="text-ecodeli-600 dark:text-ecodeli-400">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Carte interactive */}
        <section className="py-20 bg-ecodeli-50 dark:bg-ecodeli-900">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12 text-ecodeli-900 dark:text-ecodeli-100">
              Notre couverture
            </h2>
            <div className="relative h-[400px] bg-white rounded-lg overflow-hidden shadow-lg dark:bg-ecodeli-800">
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="w-16 h-16 text-ecodeli-500 dark:text-ecodeli-400" />
              </div>
              <motion.div
                className="absolute bottom-4 left-4 bg-white p-6 rounded-lg shadow-lg dark:bg-ecodeli-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="font-bold text-ecodeli-800 mb-4 text-xl dark:text-ecodeli-200">Zones desservies</h3>
                <ul className="text-ecodeli-600 space-y-2 dark:text-ecodeli-400">
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 mr-2 text-ecodeli-500 dark:text-ecodeli-400" />
                    Paris et Île-de-France
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 mr-2 text-ecodeli-500 dark:text-ecodeli-400" />
                    Lyon
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 mr-2 text-ecodeli-500 dark:text-ecodeli-400" />
                    Marseille
                  </li>
                  <li className="flex items-center">
                    <ChevronRight className="w-4 h-4 mr-2 text-ecodeli-500 dark:text-ecodeli-400" />
                    Et bien plus encore !
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Testimonials Section améliorée */}
        <section className="py-20 bg-white dark:bg-ecodeli-800">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12 text-ecodeli-900 dark:text-ecodeli-100">
              Ils nous font confiance
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={index}
                    className={`transition-opacity duration-300 ${
                      index === activeTestimonial ? "opacity-100" : "opacity-0 absolute top-0 left-0"
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: index === activeTestimonial ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="bg-ecodeli-50 border-ecodeli-200 dark:bg-ecodeli-700 dark:border-ecodeli-600">
                      <CardContent className="pt-6">
                        <div className="flex items-center mb-4">
                          <div className="mr-4">
                            <PlaceholderImage width={60} height={60} />
                          </div>
                          <div>
                            <h3 className="font-bold text-ecodeli-800 text-lg dark:text-ecodeli-200">
                              {testimonial.name}
                            </h3>
                            <p className="text-ecodeli-600 dark:text-ecodeli-400">{testimonial.role}</p>
                          </div>
                        </div>
                        <Quote className="w-8 h-8 text-ecodeli-400 mb-4 dark:text-ecodeli-500" />
                        <p className="text-lg mb-4 text-ecodeli-700 italic dark:text-ecodeli-300">
                          {testimonial.content}
                        </p>
                        <div className="flex items-center">
                          {Array.from({ length: testimonial.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="w-5 h-5 fill-ecodeli-400 text-ecodeli-400 dark:fill-ecodeli-500 dark:text-ecodeli-500"
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-3 h-3 rounded-full ${
                      index === activeTestimonial
                        ? "bg-ecodeli-600"
                        : "bg-ecodeli-200 dark:bg-ecodeli-600 dark:opacity-50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section avec HoverCard */}
        <section className="container py-20">
          <h2 className="text-3xl font-bold tracking-tighter text-center mb-12 text-ecodeli-900 dark:text-ecodeli-100">
            Pourquoi choisir EcoDeli ?
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Package,
                title: "Livraison intelligente",
                description: "Optimisation des trajets existants",
                details:
                  "Notre algorithme trouve les meilleurs itinéraires pour réduire les émissions de CO2 et les coûts.",
              },
              {
                icon: Shield,
                title: "Sécurité maximale",
                description: "Protection de vos envois",
                details: "Assurance incluse jusqu'à 500€ et système de vérification des livreurs.",
              },
              {
                icon: Users,
                title: "Communauté engagée",
                description: "Réseau de confiance",
                details: "Système de notation et de commentaires pour garantir la qualité du service.",
              },
            ].map((feature, index) => (
              <HoverCard key={feature.title}>
                <HoverCardTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="cursor-pointer transition-all hover:shadow-lg bg-white border-ecodeli-200 dark:bg-ecodeli-800 dark:border-ecodeli-600">
                      <CardHeader>
                        <feature.icon className="w-12 h-12 text-ecodeli-600 mb-4 dark:text-ecodeli-400" />
                        <CardTitle className="text-ecodeli-800 dark:text-ecodeli-200">{feature.title}</CardTitle>
                        <CardDescription className="text-ecodeli-600 dark:text-ecodeli-400">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 bg-white dark:bg-ecodeli-700">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-ecodeli-800 dark:text-ecodeli-200">{feature.title}</h4>
                    <p className="text-sm text-ecodeli-600 dark:text-ecodeli-400">{feature.details}</p>
                  </div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-ecodeli-50 dark:bg-ecodeli-900">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12 text-ecodeli-900 dark:text-ecodeli-100">
              Foire aux questions
            </h2>
            <Accordion type="single" collapsible className="max-w-2xl mx-auto">
              {[
                {
                  question: "Comment fonctionne EcoDeli ?",
                  answer:
                    "EcoDeli met en relation des personnes qui ont besoin d'envoyer des colis avec des livreurs qui effectuent déjà le trajet. Cela permet d'optimiser les livraisons et de réduire l'impact environnemental.",
                },
                {
                  question: "Est-ce que mes colis sont assurés ?",
                  answer:
                    "Oui, tous les colis sont assurés jusqu'à 500€ par défaut. Vous pouvez souscrire à une assurance supplémentaire pour des objets de plus grande valeur.",
                },
                {
                  question: "Comment devenir livreur EcoDeli ?",
                  answer:
                    "Pour devenir livreur, inscrivez-vous sur notre plateforme, complétez votre profil avec les documents nécessaires, et commencez à accepter des livraisons qui correspondent à vos trajets.",
                },
                {
                  question: "Quels sont les délais de livraison ?",
                  answer:
                    "Les délais varient en fonction des trajets disponibles. Vous pouvez voir une estimation du délai de livraison avant de confirmer votre envoi.",
                },
              ].map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-ecodeli-800 hover:text-ecodeli-600 dark:text-ecodeli-200 dark:hover:text-ecodeli-400">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-ecodeli-600 dark:text-ecodeli-400">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Stripe Checkout Demo Section */}
        <section className="py-20 bg-white dark:bg-ecodeli-800">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tighter text-center mb-12 text-ecodeli-900 dark:text-ecodeli-100">
              Essayez notre service
            </h2>
            <div className="max-w-md mx-auto bg-ecodeli-50 p-8 rounded-lg shadow-lg border border-ecodeli-200 dark:bg-ecodeli-700 dark:border-ecodeli-600">
              <h3 className="text-2xl font-semibold mb-4 text-ecodeli-800 dark:text-ecodeli-200">
                Livraison EcoDeli Premium
              </h3>
              <p className="text-ecodeli-600 mb-6 dark:text-ecodeli-400">
                Profitez d'une livraison écologique et rapide pour votre prochain envoi.
              </p>
              <div className="flex justify-between items-center mb-6">
                <span className="text-3xl font-bold text-ecodeli-800 dark:text-ecodeli-200">15,99 €</span>
                <CheckoutButton amount={1599} />
              </div>
              <p className="text-sm text-ecodeli-500 italic dark:text-ecodeli-400">
                *Ceci est une démonstration. Aucun frais ne sera prélevé.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section améliorée */}
        <section className="relative py-20 bg-gradient-to-r from-ecodeli-100 to-ecodeli-200 dark:from-ecodeli-800 dark:to-ecodeli-900">
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <h2 className="text-4xl font-bold tracking-tighter text-ecodeli-900 dark:text-ecodeli-100">
                Prêt à révolutionner la livraison ?
              </h2>
              <p className="text-xl text-ecodeli-700 dark:text-ecodeli-300">
                Rejoignez EcoDeli aujourd'hui et participez à la construction d'un avenir plus durable.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="transition-all hover:scale-105 bg-ecodeli-600 text-white hover:bg-ecodeli-700 dark:bg-ecodeli-500 dark:hover:bg-ecodeli-600"
                >
                  <Link href="/auth/signup">Commencer gratuitement</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="transition-all hover:scale-105 border-ecodeli-600 text-ecodeli-600 hover:bg-ecodeli-100 dark:border-ecodeli-400 dark:text-ecodeli-400 dark:hover:bg-ecodeli-800"
                >
                  <Link href="/contact">Contacter l'équipe</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer amélioré */}
      <footer className="border-t border-ecodeli-200 bg-white dark:bg-ecodeli-900 dark:border-ecodeli-800">
        <div className="container py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Leaf className="h-6 w-6 text-ecodeli-600 dark:text-ecodeli-400" />
                <span className="text-xl font-bold text-ecodeli-800 dark:text-ecodeli-200">EcoDeli</span>
              </div>
              <p className="text-sm text-ecodeli-600 mb-4 dark:text-ecodeli-400">
                La livraison collaborative, écologique et économique.
              </p>
              <div className="flex space-x-4">{/* Social media links */}</div>
            </div>
            {[
              {
                title: "Produit",
                links: ["Fonctionnalités", "Tarifs", "Sécurité"],
              },
              {
                title: "Entreprise",
                links: ["À propos", "Blog", "Carrières"],
              },
              {
                title: "Ressources",
                links: ["Centre d'aide", "Documentation", "Contact"],
              },
            ].map((section) => (
              <div key={section.title} className="space-y-4">
                <h4 className="text-sm font-semibold text-ecodeli-800 dark:text-ecodeli-200">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-sm text-ecodeli-600 hover:text-ecodeli-800 transition-colors dark:text-ecodeli-400 dark:hover:text-ecodeli-200"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-ecodeli-200 text-center text-sm text-ecodeli-600 dark:border-ecodeli-800 dark:text-ecodeli-400">
            <p>&copy; 2025 EcoDeli. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

