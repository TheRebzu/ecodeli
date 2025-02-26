"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PlaceholderImage } from "@/components/ui/placeholder-image"

export function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  // Données des témoignages
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

  // Rotation automatique des témoignages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [testimonials.length])

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
                              <PlaceholderImage width={64} height={64} />
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
  )
}