"use client"

import { motion } from "framer-motion"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { CheckoutButton } from "@/components/checkout-button"

export function Pricing() {
  return (
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
              <div className="w-full bg-gradient-to-r from-ecodeli-600 to-ecodeli-500 hover:from-ecodeli-700 hover:to-ecodeli-600 text-white dark:from-ecodeli-500 dark:to-ecodeli-600 dark:hover:from-ecodeli-400 dark:hover:to-ecodeli-500 transition-all duration-300 hover:shadow-lg shadow-md py-3 text-lg font-medium rounded-md">
                <CheckoutButton amount={1599} />
              </div>
              <p className="text-sm text-ecodeli-500 italic dark:text-ecodeli-400 text-center">
                *Ceci est une démonstration. Aucun frais ne sera prélevé.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}