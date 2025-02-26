"use client"

import { motion } from "framer-motion"
import { MapPin, ChevronRight } from "lucide-react"

export function CoverageMap() {
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

  // Liste des zones desservies
  const zones = [
    "Paris et Île-de-France",
    "Lyon",
    "Marseille",
    "Et bien plus encore !"
  ]

  // Coordonnées des villes principales
  const cities = [
    { name: "Paris", position: "top-1/4 left-1/2", size: "w-10 h-10", delay: 0 },
    { name: "Lyon", position: "bottom-1/4 left-1/4", size: "w-8 h-8", delay: 0.5 },
    { name: "Marseille", position: "bottom-1/3 right-1/4", size: "w-8 h-8", delay: 1 }
  ]

  return (
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
          {/* Fond de carte */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10 bg-[url('/placeholder.svg?height=800&width=1200')]"></div>

          {/* Carte interactive */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-72 h-72">
              {cities.map((city) => (
                <motion.div
                  key={city.name}
                  className={`absolute ${city.position} transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center`}
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    delay: city.delay
                  }}
                >
                  <div className="relative">
                    <MapPin className={`${city.size} text-ecodeli-500 drop-shadow-md filter saturate-150`} />
                    <motion.div
                      className="absolute -inset-1 rounded-full bg-ecodeli-500/30 z-0"
                      animate={{
                        scale: [1, 1.8, 1],
                        opacity: [0.3, 0, 0.3]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        delay: city.delay
                      }}
                    />
                  </div>
                  <div className="text-sm font-medium text-ecodeli-800 dark:text-ecodeli-200 mt-1 bg-white/70 dark:bg-ecodeli-900/70 px-2 py-0.5 rounded-md backdrop-blur-sm">{city.name}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Légende */}
          <motion.div
            className="absolute bottom-4 left-4 bg-white/90 p-6 rounded-xl shadow-lg dark:bg-ecodeli-700/90 backdrop-blur-sm border border-ecodeli-100 dark:border-ecodeli-600"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="font-bold text-ecodeli-800 mb-4 text-xl dark:text-ecodeli-100">Zones desservies</h3>
            <ul className="text-ecodeli-700 space-y-2 dark:text-ecodeli-300">
              {zones.map((zone, index) => (
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
  )
}