"use client"

import { motion } from "framer-motion"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"

export function Faq() {
  // Questions fréquentes et leurs réponses
  const faqItems = [
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
            {faqItems.map((item, index) => (
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
  )
}