import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Truck, Package, Warehouse, Calendar, ShoppingBag, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Bienvenue | EcoDeli",
  description: "Découvrez EcoDeli, la plateforme de livraison et de stockage écologique."
};

export default function ClientHomePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Bienvenue sur EcoDeli</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          La plateforme qui révolutionne la livraison et le stockage avec une approche écoresponsable.
        </p>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl p-8 mb-16 text-white">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-2/3 mb-8 md:mb-0 md:pr-8">
            <h2 className="text-3xl font-bold mb-4">Livraison écologique et stockage responsable</h2>
            <p className="text-blue-100 mb-6">
              EcoDeli vous offre une solution complète pour vos besoins de livraison et de stockage, avec une empreinte carbone minimale.
              Rejoignez notre communauté d'utilisateurs écoresponsables et contribuez à un avenir plus durable.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/client/dashboard" 
                className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Accéder à mon espace
              </Link>
              <Link 
                href="/client/announcements" 
                className="bg-blue-600 text-white border border-blue-300 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Voir les annonces
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <div className="w-64 h-64 rounded-full bg-blue-600 flex items-center justify-center">
              <Truck className="w-32 h-32 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Nos services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ServiceCard 
            icon={<Truck className="w-12 h-12 text-blue-600" />}
            title="Livraison écologique"
            description="Des livraisons effectuées avec des véhicules électriques et des emballages compostables."
            link="/client/services"
          />
          <ServiceCard 
            icon={<Warehouse className="w-12 h-12 text-green-600" />}
            title="Stockage responsable"
            description="Des espaces de stockage optimisés et écoénergétiques pour vos affaires."
            link="/client/storage"
          />
          <ServiceCard 
            icon={<ShoppingBag className="w-12 h-12 text-purple-600" />}
            title="Marketplace verte"
            description="Achetez des produits locaux et écoresponsables auprès de nos partenaires."
            link="/client/shopping"
          />
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 rounded-xl p-8 mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Comment ça marche ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <StepCard 
            number="1"
            title="Créez votre compte"
            description="Inscrivez-vous et configurez votre profil en quelques clics."
          />
          <StepCard 
            number="2"
            title="Choisissez un service"
            description="Livraison, stockage ou achat de produits selon vos besoins."
          />
          <StepCard 
            number="3"
            title="Programmez votre demande"
            description="Sélectionnez une date et un créneau horaire qui vous conviennent."
          />
          <StepCard 
            number="4"
            title="Suivez en temps réel"
            description="Recevez des notifications à chaque étape de votre commande."
          />
        </div>
      </div>

      {/* Testimonials */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Ce que disent nos clients</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TestimonialCard 
            quote="EcoDeli a complètement transformé ma façon de gérer mes livraisons. Je suis ravi de contribuer à un service aussi responsable."
            author="Pierre D."
            role="Client particulier"
          />
          <TestimonialCard 
            quote="Le service de stockage est parfait pour mon entreprise. Les espaces sont propres, sécurisés et l'impact environnemental est minimal."
            author="Sophie M."
            role="Petite entreprise"
          />
          <TestimonialCard 
            quote="J'apprécie particulièrement la transparence d'EcoDeli sur son empreinte carbone et ses efforts pour la réduire constamment."
            author="Jean L."
            role="Client régulier"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-100 rounded-xl p-8 mb-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Prêt à rejoindre la révolution verte de la livraison ?</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Créez votre compte et découvrez tous les services que nous proposons pour faciliter votre quotidien tout en respectant l'environnement.
        </p>
        <Link 
          href="/client/dashboard" 
          className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-lg font-medium inline-flex items-center transition-colors"
        >
          Commencer maintenant <ChevronRight className="ml-2 w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
}

function ServiceCard({ icon, title, description, link }: ServiceCardProps) {
  return (
    <Link
      href={link}
      className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col items-center text-center"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="mt-auto flex items-center text-blue-600 font-medium">
        En savoir plus <ChevronRight className="ml-1 w-4 h-4" />
      </div>
    </Link>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
}

function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
      <div className="mb-4 text-gray-600 italic">"{quote}"</div>
      <div className="font-medium text-gray-900">{author}</div>
      <div className="text-sm text-gray-500">{role}</div>
    </div>
  );
} 