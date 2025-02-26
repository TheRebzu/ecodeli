"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Coffee, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Cta() {
  return (
    <section className="relative py-20 bg-gradient-to-r from-ecodeli-100 to-ecodeli-200 dark:from-ecodeli-800 dark:to-ecodeli-900 transition-colors duration-500 overflow-hidden">
      {/* Background animations */}
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

      {/* Content */}
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
  )
}