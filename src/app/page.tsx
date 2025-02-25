"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"
import {
  ArrowRight, Leaf, Package, Users, Shield,
  Star, Quote, MapPin, ChevronRight, Sun, Moon,
  Truck, Recycle, CreditCard, Heart, Coffee,
  Menu, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ModeToggle } from "@/components/mode-toggle"
import { CheckoutButton } from "@/components/checkout-button"
import { PlaceholderImage } from "@/components/ui/placeholder-image"

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Gestionnaire automatique des témoignages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Gestion de l'état monté pour éviter les erreurs d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Détection du scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fermer le menu mobile lors du changement de page
  useEffect(() => {
    setMobileMenuOpen(false)
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
    {
      name: "Jean D.",
      role: "Prestataire de services",
      content: "Je peux proposer mes services et optimiser mes déplacements, c'est un gain de temps considérable.",
      rating: 4,
      image: "/placeholder.svg?height=100&width=100",
    },
  ]

  const features = [
    {
      icon: Package,
      title: "Livraison intelligente",
      description: "Optimisation des trajets existants",
      details: "Notre algorithme trouve les meilleurs itinéraires pour réduire les émissions de CO2 et les coûts.",
      color: "text-emerald-600 dark:text-emerald-300",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
    },
    {
      icon: Shield,
      title: "Sécurité maximale",
      description: "Protection de vos envois",
      details: "Assurance incluse jusqu'à 500€ et système de vérification des livreurs.",
      color: "text-blue-600 dark:text-blue-300",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
    },
    {
      icon: Users,
      title: "Communauté engagée",
      description: "Réseau de confiance",
      details: "Système de notation et de commentaires pour garantir la qualité du service.",
      color: "text-purple-600 dark:text-purple-300",
      bgColor: "bg-purple-100 dark:bg-purple-900/50",
    },
    {
      icon: Recycle,
      title: "Impact écologique",
      description: "Réduction de l'empreinte carbone",
      details: "Notre approche permet de réduire jusqu'à 70% les émissions de CO2 par rapport aux livraisons traditionnelles.",
      color: "text-green-600 dark:text-green-300",
      bgColor: "bg-green-100 dark:bg-green-900/50",
    },
    {
      icon: CreditCard,
      title: "Paiements sécurisés",
      description: "Transactions protégées",
      details: "Paiements sécurisés et déblocage des fonds uniquement après confirmation de livraison.",
      color: "text-amber-600 dark:text-amber-300",
      bgColor: "bg-amber-100 dark:bg-amber-900/50",
    },
    {
      icon: Heart,
      title: "Services personnalisés",
      description: "Prestations sur mesure",
      details: "Des services adaptés à vos besoins, des petits colis aux prestations spécifiques.",
      color: "text-red-600 dark:text-red-300",
      bgColor: "bg-red-100 dark:bg-red-900/50",
    },
  ]

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  }

  const slideIn = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
      },
    },
  }

  if (!mounted) {
    // Rendu initial pour éviter les erreurs d'hydratation
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-ecodeli-50 via-white to-ecodeli-50 dark:from-ecodeli-950 dark:via-ecodeli-900 dark:to-ecodeli-950 transition-colors duration-500">
      {/* Navigation améliorée avec effet de fond au scroll et mode sombre */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled 
            ? "bg-white/95 dark:bg-ecodeli-950/95 backdrop-blur-md shadow-sm" 
            : "bg-transparent"
        }`}
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="flex items-center p-1.5 rounded-full bg-ecodeli-100 dark:bg-ecodeli-800 group-hover:bg-ecodeli-200 dark:group-hover:bg-ecodeli-700 transition-colors duration-300">
                <Leaf className="h-6 w-6 text-ecodeli-600 dark:text-ecodeli-300 group-hover:text-ecodeli-700 dark:group-hover:text-ecodeli-200 transition-colors duration-300" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-br from-ecodeli-700 to-ecodeli-500 bg-clip-text text-transparent dark:from-ecodeli-300 dark:to-ecodeli-500">
                EcoDeli
              </span>
            </Link>
          </div>

          {/* Menu mobile */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-ecodeli-600 dark:text-ecodeli-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* Navigation desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            {["À propos", "Services", "Contact"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                className="text-sm font-medium text-ecodeli-700 hover:text-ecodeli-900 transition-colors dark:text-ecodeli-300 dark:hover:text-ecodeli-100 relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-ecodeli-500 dark:bg-ecodeli-400 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-ecodeli-100 dark:hover:bg-ecodeli-800 transition-colors duration-300"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5 text-amber-400 hover:text-amber-500 transition-colors" />
                    ) : (
                      <Moon className="h-5 w-5 text-ecodeli-600 hover:text-ecodeli-800 transition-colors" />
                    )}
                    <span className="sr-only">Changer le thème</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Basculer vers mode {theme === "dark" ? "clair" : "sombre"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              asChild
              variant="ghost"
              className="transition-all duration-300 hover:scale-105 text-ecodeli-700 dark:text-ecodeli-300 hover:text-ecodeli-900 dark:hover:text-ecodeli-100"
            >
              <Link href="/auth/signin">Connexion</Link>
            </Button>
            <Button
              asChild
              className="transition-all duration-300 hover:scale-105 bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 hover:from-ecodeli-700 hover:to-ecodeli-600 text-white dark:from-ecodeli-500 dark:to-ecodeli-600 dark:hover:from-ecodeli-400 dark:hover:to-ecodeli-500 shadow-md hover:shadow-lg"
            >
              <Link href="/auth/signup">Inscription</Link>
            </Button>
          </div>
        </div>

        {/* Menu mobile overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-white dark:bg-ecodeli-900 shadow-lg"
            >
              <div className="container py-4 space-y-4">
                <nav className="flex flex-col space-y-3">
                  {["À propos", "Services", "Contact"].map((item) => (
                    <Link
                      key={item}
                      href={`/${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                      className="text-lg font-medium text-ecodeli-700 hover:text-ecodeli-900 transition-colors dark:text-ecodeli-300 dark:hover:text-ecodeli-100 py-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item}
                    </Link>
                  ))}
                </nav>

                <div className="flex flex-col space-y-3 pt-2 border-t border-ecodeli-100 dark:border-ecodeli-800">
                  <div className="flex items-center justify-between">
                    <span className="text-ecodeli-700 dark:text-ecodeli-300">Changer de thème</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-ecodeli-100 dark:hover:bg-ecodeli-800"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                      {theme === "dark" ? (
                        <Sun className="h-5 w-5 text-amber-400" />
                      ) : (
                        <Moon className="h-5 w-5 text-ecodeli-600" />
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-ecodeli-500 text-ecodeli-700 dark:border-ecodeli-600 dark:text-ecodeli-300"
                    >
                      <Link href="/auth/signin">Connexion</Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 text-white dark:from-ecodeli-500 dark:to-ecodeli-600"
                    >
                      <Link href="/auth/signup">Inscription</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {/* Hero Section améliorée avec plus d'animation */}
        <section className="relative px-4 py-20 md:py-32 lg:py-40 overflow-hidden bg-gradient-to-br from-ecodeli-50 to-ecodeli-100 dark:from-ecodeli-900 dark:to-ecodeli-800 transition-colors duration-500">
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-ecodeli-300 opacity-20 dark:bg-ecodeli-500 dark:opacity-10"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            <motion.div
              className="absolute top-60 -left-20 w-60 h-60 rounded-full bg-ecodeli-400 opacity-10 dark:bg-ecodeli-600 dark:opacity-10"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -3, 0]
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 2
              }}
            />
          </div>
          <div className="container relative flex flex-col items-center text-center space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge
                variant="outline"
                className="bg-white/90 text-ecodeli-800 mb-4 dark:bg-ecodeli-800/90 dark:text-ecodeli-200 backdrop-blur-sm shadow-sm border-ecodeli-200 dark:border-ecodeli-700 px-4 py-1.5 text-sm"
              >
                <Truck className="w-4 h-4 mr-2" /> Nouveau : Livraison écologique et économique
              </Badge>
            </motion.div>
            <motion.h1
              className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-ecodeli-900 dark:text-ecodeli-50 drop-shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              La livraison{" "}
              <span className="bg-gradient-to-r from-ecodeli-700 to-ecodeli-500 bg-clip-text text-transparent dark:from-ecodeli-300 dark:to-ecodeli-500">
                réinventée
              </span>
            </motion.h1>
            <motion.p
              className="mx-auto max-w-[700px] text-ecodeli-700 md:text-xl dark:text-ecodeli-200 font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Rejoignez la communauté EcoDeli et participez à une nouvelle façon de livrer, plus écologique et
              économique. Ensemble, rendons le transport de colis plus responsable.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 hover:from-ecodeli-700 hover:to-ecodeli-600 text-white dark:from-ecodeli-500 dark:to-ecodeli-600 dark:hover:from-ecodeli-400 dark:hover:to-ecodeli-500 shadow-lg hover:shadow-xl"
              >
                <Link href="/auth/signup">
                  Commencer maintenant <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto transition-all duration-300 hover:scale-105 border-ecodeli-600 text-ecodeli-600 hover:bg-ecodeli-50 dark:border-ecodeli-400 dark:text-ecodeli-300 dark:hover:text-ecodeli-200 dark:hover:bg-ecodeli-800/50 shadow-sm hover:shadow-md"
              >
                En savoir plus
              </Button>
            </motion.div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mt-12 w-full max-w-4xl">
              {[
                { label: "Utilisateurs actifs", value: "10K+", icon: Users },
                { label: "Livraisons réussies", value: "50K+", icon: Truck },
                { label: "Satisfaction client", value: "98%", icon: Star },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center p-6 bg-white/90 rounded-xl shadow-lg backdrop-blur-sm dark:bg-ecodeli-800/90 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-ecodeli-100/50 dark:border-ecodeli-700/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                >
                  <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-ecodeli-100 dark:bg-ecodeli-700 mb-4 shadow-inner">
                    <stat.icon className="w-6 h-6 text-ecodeli-600 dark:text-ecodeli-300" />
                  </div>
                  <div className="text-3xl font-bold text-ecodeli-700 mb-2 dark:text-ecodeli-200">{stat.value}</div>
                  <div className="text-sm font-medium text-ecodeli-600 dark:text-ecodeli-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Section Comment ça marche avec Tabs */}
        <section className="container py-20">
          <motion.h2
            className="text-3xl font-bold tracking-tighter text-center mb-4 text-ecodeli-900 dark:text-ecodeli-50"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Comment ça marche ?
          </motion.h2>
          <motion.p
            className="text-center text-ecodeli-700 dark:text-ecodeli-300 max-w-2xl mx-auto mb-12 font-medium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Une expérience simple et fluide, que vous soyez expéditeur ou livreur
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs defaultValue="sender" className="max-w-3xl mx-auto">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-ecodeli-100 dark:bg-ecodeli-800 rounded-lg">
                <TabsTrigger
                  value="sender"
                  className="text-lg py-3 data-[state=active]:bg-white data-[state=active]:text-ecodeli-800 data-[state=active]:shadow-md dark:data-[state=active]:bg-ecodeli-700 dark:data-[state=active]:text-ecodeli-100 transition-all duration-300 rounded-md"
                >
                  Je veux envoyer
                </TabsTrigger>
                <TabsTrigger
                  value="courier"
                  className="text-lg py-3 data-[state=active]:bg-white data-[state=active]:text-ecodeli-800 data-[state=active]:shadow-md dark:data-[state=active]:bg-ecodeli-700 dark:data-[state=active]:text-ecodeli-100 transition-all duration-300 rounded-md"
                >
                  Je veux livrer
                </TabsTrigger>
              </TabsList>
              <TabsContent value="sender" className="mt-6 space-y-6">
                <div className="grid gap-6">
                  {[
                    {
                      title: "1. Publiez votre annonce",
                      description: "Décrivez votre colis et indiquez les points de collecte et de livraison.",
                      icon: Package,
                    },
                    {
                      title: "2. Choisissez un livreur",
                      description:
                        "Sélectionnez parmi les livreurs disponibles celui qui correspond le mieux à vos besoins.",
                      icon: Users,
                    },
                    {
                      title: "3. Suivez votre livraison",
                      description: "Suivez en temps réel l'avancement de votre livraison et recevez des notifications.",
                      icon: Truck,
                    },
                  ].map((step, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md dark:bg-ecodeli-800 hover:shadow-lg transition-all duration-300 border border-ecodeli-100/50 dark:border-ecodeli-700/50"
                      custom={index}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={fadeIn}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ecodeli-500 to-ecodeli-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-ecodeli-800 mb-2 dark:text-ecodeli-200">
                          {step.title}
                        </h3>
                        <p className="text-ecodeli-600 dark:text-ecodeli-400 leading-relaxed">
                          {step.description}
                        </p>
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
                      icon: Users,
                    },
                    {
                      title: "2. Trouvez des livraisons",
                      description: "Parcourez les annonces correspondant à vos trajets habituels.",
                      icon: MapPin,
                    },
                    {
                      title: "3. Gagnez de l'argent",
                      description: "Effectuez les livraisons et recevez votre paiement de manière sécurisée.",
                      icon: CreditCard,
                    },
                  ].map((step, index) => (
                    <motion.div
                      key={index}
                      className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md dark:bg-ecodeli-800 hover:shadow-lg transition-all duration-300 border border-ecodeli-100/50 dark:border-ecodeli-700/50"
                      custom={index}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      variants={fadeIn}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ecodeli-500 to-ecodeli-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-ecodeli-800 mb-2 dark:text-ecodeli-200">
                          {step.title}
                        </h3>
                        <p className="text-ecodeli-600 dark:text-ecodeli-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </section>

        {/* Carte interactive */}
        <section className="py-20 bg-ecodeli-50 dark:bg-ecodeli-900 transition-colors duration-500">
          <div className="container">
            <motion.h2
              className="text-3xl font-bold tracking-tighter text-center mb-4 text-ecodeli-900 dark:text-ecodeli-50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Notre couverture
            </motion.h2>
            <motion.p
              className="text-center text-ecodeli-700 dark:text-ecodeli-300 max-w-2xl mx-auto mb-12 font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              En constante expansion pour vous servir dans toute la France
            </motion.p>
            <motion.div
              className="relative h-[400px] bg-white rounded-xl overflow-hidden shadow-lg dark:bg-ecodeli-800 transition-colors duration-300 border border-ecodeli-100/50 dark:border-ecodeli-700/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[url('/placeholder.svg?height=800&width=1200')]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-72 h-72">
                  <motion.div
                    className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                    }}
                  >
                    <div className="relative">
                      <MapPin className="w-10 h-10 text-ecodeli-500 drop-shadow-md filter saturate-150" />
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-ecodeli-500/30 z-0"
                        animate={{
                          scale: [1, 1.8, 1],
                          opacity: [0.3, 0, 0.3]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-ecodeli-800 dark:text-ecodeli-200 mt-1 bg-white/70 dark:bg-ecodeli-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm">Paris</div>
                  </motion.div>

                  <motion.div
                    className="absolute bottom-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      delay: 0.5
                    }}
                  >
                    <div className="relative">
                      <MapPin className="w-8 h-8 text-ecodeli-500 drop-shadow-md filter saturate-150" />
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-ecodeli-500/30 z-0"
                        animate={{
                          scale: [1, 1.8, 1],
                          opacity: [0.3, 0, 0.3]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          delay: 0.5
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-ecodeli-800 dark:text-ecodeli-200 mt-1 bg-white/70 dark:bg-ecodeli-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm">Lyon</div>
                  </motion.div>

                  <motion.div
                    className="absolute bottom-1/3 right-1/4 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      delay: 1
                    }}
                  >
                    <div className="relative">
                      <MapPin className="w-8 h-8 text-ecodeli-500 drop-shadow-md filter saturate-150" />
                      <motion.div
                        className="absolute -inset-1 rounded-full bg-ecodeli-500/30 z-0"
                        animate={{
                          scale: [1, 1.8, 1],
                          opacity: [0.3, 0, 0.3]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          delay: 1
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-ecodeli-800 dark:text-ecodeli-200 mt-1 bg-white/70 dark:bg-ecodeli-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm">Marseille</div>
                  </motion.div>
                </div>
              </div>
              <motion.div
                className="absolute bottom-4 left-4 bg-white/90 p-6 rounded-xl shadow-lg dark:bg-ecodeli-700/90 backdrop-blur-sm border border-ecodeli-100 dark:border-ecodeli-600"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <h3 className="font-bold text-ecodeli-800 mb-4 text-xl dark:text-ecodeli-100">Zones desservies</h3>
                <ul className="text-ecodeli-700 space-y-2 dark:text-ecodeli-300">
                  {[
                    "Paris et Île-de-France",
                    "Lyon",
                    "Marseille",
                    "Et bien plus encore !"
                  ].map((zone, index) => (
                    <motion.li
                      key={zone}
                      className="flex items-center"
                      variants={slideIn}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + (index * 0.1) }}
                    >
                      <ChevronRight className="w-4 h-4 mr-2 text-ecodeli-500 dark:text-ecodeli-400" />
                      {zone}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section améliorée */}
        <section className="py-20 bg-white dark:bg-ecodeli-800 transition-colors duration-500">
          <div className="container">
            <motion.h2
              className="text-3xl font-bold tracking-tighter text-center mb-4 text-ecodeli-900 dark:text-ecodeli-50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ils nous font confiance
            </motion.h2>
            <motion.p
              className="text-center text-ecodeli-700 dark:text-ecodeli-300 max-w-2xl mx-auto mb-8 font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Découvrez les avantages qui font notre différence
            </motion.p>
            <motion.div
              className="text-center text-ecodeli-600 dark:text-ecodeli-400 max-w-md mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Des utilisateurs satisfaits partout en France
            </motion.div>
            <div className="max-w-4xl mx-auto px-4">
              <div className="relative h-[300px] sm:h-[280px]">
                <AnimatePresence mode="wait">
                  {testimonials.map((testimonial, index) => (
                    index === activeTestimonial && (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0"
                      >
                        <Card className="h-full bg-gradient-to-br from-ecodeli-50 to-white border-ecodeli-200 dark:from-ecodeli-800 dark:to-ecodeli-700 dark:border-ecodeli-600 transition-colors duration-300 rounded-xl shadow-lg hover:shadow-xl">
                          <CardContent className="flex flex-col h-full justify-between pt-6">
                            <div>
                              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6">
                                <div className="rounded-full overflow-hidden border-2 border-ecodeli-300 dark:border-ecodeli-500 w-16 h-16 flex-shrink-0 shadow-md">
                                  <PlaceholderImage width={64} height={64} className="object-cover" />
                                </div>
                                <div className="text-center sm:text-left">
                                  <h3 className="font-bold text-ecodeli-800 text-lg dark:text-ecodeli-200">
                                    {testimonial.name}
                                  </h3>
                                  <p className="text-ecodeli-600 dark:text-ecodeli-400">{testimonial.role}</p>
                                  <div className="flex items-center justify-center sm:justify-start mt-2">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`w-5 h-5 ${
                                          i < testimonial.rating
                                            ? "fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                                            : "fill-ecodeli-200 text-ecodeli-200 dark:fill-ecodeli-700 dark:text-ecodeli-700"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="relative">
                                <Quote className="absolute -top-1 -left-1 w-8 h-8 text-ecodeli-300 dark:text-ecodeli-600 opacity-50" />
                                <p className="text-lg pl-8 text-ecodeli-700 italic dark:text-ecodeli-300 leading-relaxed">
                                  {testimonial.content}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === activeTestimonial
                        ? "bg-ecodeli-600 scale-125 dark:bg-ecodeli-400"
                        : "bg-ecodeli-200 dark:bg-ecodeli-600 dark:opacity-50 hover:scale-110"
                    }`}
                    aria-label={`Voir le témoignage ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section avec HoverCard */}
        <section className="container py-20">
          <motion.h2
            className="text-3xl font-bold tracking-tighter text-center mb-4 text-ecodeli-900 dark:text-ecodeli-50"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Pourquoi choisir EcoDeli ?
          </motion.h2>
          <motion.p
            className="text-center text-ecodeli-700 dark:text-ecodeli-300 max-w-2xl mx-auto mb-12 font-medium"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Découvrez les avantages qui font notre différence
          </motion.p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
              >
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Card className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white border-ecodeli-200 dark:bg-ecodeli-800 dark:border-ecodeli-700 h-full rounded-xl">
                      <CardHeader>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${feature.bgColor} shadow-md`}>
                          <feature.icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                        <CardTitle className="text-ecodeli-800 dark:text-ecodeli-200">{feature.title}</CardTitle>
                        <CardDescription className="text-ecodeli-600 dark:text-ecodeli-400 mt-1">
                          {feature.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 bg-white dark:bg-ecodeli-700 border-ecodeli-200 dark:border-ecodeli-600 shadow-xl rounded-xl">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${feature.bgColor}`}>
                          <feature.icon className={`w-4 h-4 ${feature.color}`} />
                        </div>
                        <h4 className="text-sm font-semibold text-ecodeli-800 dark:text-ecodeli-200">{feature.title}</h4>
                      </div>
                      <p className="text-sm text-ecodeli-600 dark:text-ecodeli-400 leading-relaxed">{feature.details}</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-ecodeli-50 dark:bg-ecodeli-900 transition-colors duration-500">
          <div className="container">
            <motion.h2
              className="text-3xl font-bold tracking-tighter text-center mb-4 text-ecodeli-900 dark:text-ecodeli-50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Foire aux questions
            </motion.h2>
            <motion.p
              className="text-center text-ecodeli-700 dark:text-ecodeli-300 max-w-2xl mx-auto mb-12 font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Vous avez des questions ? Nous avons les réponses
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
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
                  {
                    question: "Comment suis-je payé en tant que livreur ?",
                    answer:
                      "Les paiements sont effectués de manière sécurisée via notre plateforme. Vous pouvez retirer vos gains sur votre compte bancaire à tout moment.",
                  },
                ].map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-ecodeli-200 dark:border-ecodeli-700 overflow-hidden mb-3 rounded-lg"
                  >
                    <AccordionTrigger
                      className="text-ecodeli-800 hover:text-ecodeli-600 dark:text-ecodeli-200 dark:hover:text-ecodeli-400 px-4 py-3 bg-white dark:bg-ecodeli-800 hover:bg-ecodeli-50 dark:hover:bg-ecodeli-700 transition-all duration-300 rounded-lg font-medium"
                    >
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent
                      className="text-ecodeli-600 dark:text-ecodeli-400 bg-white dark:bg-ecodeli-800 px-4 pb-4 pt-2 leading-relaxed"
                    >
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* Checkout Demo Section */}
        <section className="py-20 bg-white dark:bg-ecodeli-800 transition-colors duration-500">
          <div className="container">
            <motion.h2
              className="text-3xl font-bold tracking-tighter text-center mb-4 text-ecodeli-900 dark:text-ecodeli-50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Essayez notre service
            </motion.h2>
            <motion.p
              className="text-center text-ecodeli-700 dark:text-ecodeli-300 max-w-2xl mx-auto mb-12 font-medium"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Découvrez nos tarifs compétitifs et écologiques
            </motion.p>
            <motion.div
              className="max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="border-ecodeli-200 dark:border-ecodeli-600 overflow-hidden shadow-lg rounded-xl transition-all duration-300 hover:shadow-xl">
                <div className="h-4 bg-gradient-to-r from-ecodeli-600 to-ecodeli-400 dark:from-ecodeli-500 dark:to-ecodeli-400"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-2xl font-semibold text-ecodeli-800 dark:text-ecodeli-200">
                    Livraison EcoDeli Premium
                  </CardTitle>
                  <CardDescription className="text-ecodeli-600 dark:text-ecodeli-400 mt-1">
                    Profitez d'une livraison écologique et rapide pour votre prochain envoi.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-ecodeli-100 dark:border-ecodeli-700 pb-2">
                      <span className="text-ecodeli-600 dark:text-ecodeli-300">Livraison standard</span>
                      <span className="text-ecodeli-800 dark:text-ecodeli-200 font-medium">9,99 €</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-ecodeli-100 dark:border-ecodeli-700 pb-2">
                      <span className="text-ecodeli-600 dark:text-ecodeli-300">Option Premium</span>
                      <span className="text-ecodeli-800 dark:text-ecodeli-200 font-medium">+6,00 €</span>
                    </div>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-ecodeli-800 dark:text-ecodeli-200">Total</span>
                      <span className="text-3xl font-bold text-ecodeli-800 dark:text-ecodeli-200">15,99 €</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <div className="w-full">
                    <CheckoutButton amount={1599} className="w-full bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 hover:from-ecodeli-700 hover:to-ecodeli-600 text-white dark:from-ecodeli-500 dark:to-ecodeli-600 dark:hover:from-ecodeli-400 dark:hover:to-ecodeli-500 transition-all duration-300 hover:shadow-lg shadow-md py-3 text-lg font-medium" />
                  </div>
                  <p className="text-sm text-ecodeli-500 italic dark:text-ecodeli-400 text-center">
                    *Ceci est une démonstration. Aucun frais ne sera prélevé.
                  </p>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* CTA Section améliorée */}
        <section className="relative py-20 bg-gradient-to-r from-ecodeli-100 to-ecodeli-200 dark:from-ecodeli-800 dark:to-ecodeli-900 transition-colors duration-500 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-ecodeli-300 opacity-30 dark:bg-ecodeli-600 dark:opacity-10"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 3, 0]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            />
            <motion.div
              className="absolute bottom-10 -left-10 w-40 h-40 rounded-full bg-ecodeli-400 opacity-20 dark:bg-ecodeli-600 dark:opacity-10"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, -3, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
                delay: 1
              }}
            />
          </div>
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <motion.h2
                className="text-4xl font-bold tracking-tighter text-ecodeli-900 dark:text-ecodeli-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                Prêt à révolutionner la livraison ?
              </motion.h2>
              <motion.p
                className="text-xl text-ecodeli-700 dark:text-ecodeli-300 font-medium"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Rejoignez EcoDeli aujourd'hui et participez à la construction d'un avenir plus durable.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto transition-all duration-300 hover:scale-105 bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 hover:from-ecodeli-700 hover:to-ecodeli-600 text-white dark:from-ecodeli-500 dark:to-ecodeli-600 dark:hover:from-ecodeli-400 dark:hover:to-ecodeli-500 shadow-lg hover:shadow-xl py-6 text-lg font-medium"
                >
                  <Link href="/auth/signup">Commencer gratuitement</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto transition-all duration-300 hover:scale-105 border-ecodeli-600 text-ecodeli-600 hover:bg-ecodeli-50 dark:border-ecodeli-400 dark:text-ecodeli-300 dark:hover:text-ecodeli-200 dark:hover:bg-ecodeli-800/50 shadow-md hover:shadow-lg py-6 text-lg font-medium bg-white/90 dark:bg-ecodeli-800/90 backdrop-blur-sm"
                >
                  <Link href="/contact">Contacter l'équipe</Link>
                </Button>
              </motion.div>

              <motion.div
                className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-ecodeli-700 dark:text-ecodeli-300 font-medium"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center">
                  <Coffee className="w-5 h-5 mr-2 text-ecodeli-600 dark:text-ecodeli-400" />
                  <span>Partenaire de commerces locaux</span>
                </div>
                <div className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-ecodeli-600 dark:text-ecodeli-400" />
                  <span>Livraison éco-responsable</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer amélioré */}
      <footer className="border-t border-ecodeli-200 bg-white dark:bg-ecodeli-900 dark:border-ecodeli-800 transition-colors duration-500">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center space-x-2 group mb-4 w-fit">
                <div className="flex items-center p-1.5 rounded-full bg-ecodeli-100 dark:bg-ecodeli-800 group-hover:bg-ecodeli-200 dark:group-hover:bg-ecodeli-700 transition-colors duration-300">
                  <Leaf className="h-5 w-5 text-ecodeli-600 dark:text-ecodeli-300 group-hover:text-ecodeli-700 dark:group-hover:text-ecodeli-200 transition-colors duration-300" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-br from-ecodeli-700 to-ecodeli-500 bg-clip-text text-transparent dark:from-ecodeli-300 dark:to-ecodeli-500">
                  EcoDeli
                </span>
              </Link>
              <p className="text-sm text-ecodeli-700 mb-6 dark:text-ecodeli-300 max-w-xs">
                La livraison collaborative, écologique et économique pour un avenir plus durable.
              </p>
              <div className="flex space-x-4">
                {/* Social media links */}
                {[
                  { name: 'twitter', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/></svg> },
                  { name: 'facebook', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/></svg> },
                  { name: 'instagram', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/></svg> },
                  { name: 'linkedin', icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg> }
                ].map((social) => (
                  <Link
                    key={social.name}
                    href={`https://${social.name}.com`}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-ecodeli-100 hover:bg-ecodeli-200 text-ecodeli-600 transition-colors duration-300 dark:bg-ecodeli-800 dark:hover:bg-ecodeli-700 dark:text-ecodeli-400 hover:text-ecodeli-700 dark:hover:text-ecodeli-300"
                    aria-label={social.name}
                  >
                    {social.icon}
                  </Link>
                ))}
              </div>
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
                <h4 className="text-sm font-semibold text-ecodeli-800 dark:text-ecodeli-200 uppercase tracking-wider">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-sm text-ecodeli-600 hover:text-ecodeli-800 transition-colors duration-300 dark:text-ecodeli-400 dark:hover:text-ecodeli-200"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-ecodeli-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-ecodeli-600 dark:border-ecodeli-800 dark:text-ecodeli-400">
            <p>&copy; 2025 EcoDeli. Tous droits réservés.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="#" className="hover:text-ecodeli-800 dark:hover:text-ecodeli-200 transition-colors duration-300">
                Confidentialité
              </Link>
              <Link href="#" className="hover:text-ecodeli-800 dark:hover:text-ecodeli-200 transition-colors duration-300">
                Conditions d'utilisation
              </Link>
              <Link href="#" className="hover:text-ecodeli-800 dark:hover:text-ecodeli-200 transition-colors duration-300">
                Mentions légales
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}