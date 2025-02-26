"use client"

import { Header } from "@/components/layout/Header"
import { Hero } from "@/components/home/Hero"
import { HowItWorks } from "@/components/home/HowItWorks"
import { CoverageMap } from "@/components/home/CoverageMap"
import { Testimonials } from "@/components/home/Testimonials"
import { Features } from "@/components/home/Features"
import { Faq } from "@/components/home/Faq"
import { Pricing } from "@/components/home/Pricing"
import { Cta } from "@/components/home/Cta"
import { Footer } from "@/components/layout/Footer"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-ecodeli-50 via-white to-ecodeli-50 dark:from-ecodeli-950 dark:via-ecodeli-900 dark:to-ecodeli-950 transition-colors duration-500">
      <Header />

      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <CoverageMap />
        <Testimonials />
        <Features />
        <Faq />
        <Pricing />
        <Cta />
      </main>

      <Footer />
    </div>
  )
}