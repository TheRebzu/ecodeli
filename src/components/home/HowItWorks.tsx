"use client"

import { motion } from "framer-motion"
import { Package, Users, Truck, MapPin, CreditCard } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function HowItWorks() {
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

  const senderSteps = [
    {
      title: "1. Publiez votre annonce",
      description: "Décrivez votre colis et indiquez les points de collecte et de livraison.",
      icon: Package,
    },
    {
      title: "2. Choisissez un livreur",
      description: "Sélectionnez parmi les livreurs disponibles celui qui correspond le mieux à vos besoins.",
      icon: Users,
    },
    {
      title: "3. Suivez votre livraison",
      description: "Suivez en temps réel l'avancement de votre livraison et recevez des notifications.",
      icon: Truck,
    },
  ]

  const courierSteps = [
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
              {senderSteps.map((step, index) => (
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
              {courierSteps.map((step, index) => (
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
  )
}