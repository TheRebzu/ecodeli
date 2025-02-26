"use client"

import { motion } from "framer-motion"
import {
  Package, Shield, Users, Recycle, CreditCard, Heart
} from "lucide-react"
import {
  Card, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card"
import {
  HoverCard, HoverCardContent, HoverCardTrigger
} from "@/components/ui/hover-card"

export function Features() {
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  }

  // Caractéristiques et avantages
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

  return (
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
  )
}