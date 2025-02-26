"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Truck, Users, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Hero() {
  const stats = [
    { label: "Utilisateurs actifs", value: "10K+", icon: Users },
    { label: "Livraisons réussies", value: "50K+", icon: Truck },
    { label: "Satisfaction client", value: "98%", icon: Star },
  ]

  return (
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
          {stats.map((stat, index) => (
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
  )
}