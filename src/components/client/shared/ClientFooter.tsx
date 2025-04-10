"use client";

import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram, Linkedin, Youtube, Mail, Phone, MapPin } from "lucide-react";

export default function ClientFooter() {
  const currentYear = new Date().getFullYear();
  
  const socialLinks = [
    { icon: <Facebook className="h-5 w-5" />, href: "https://facebook.com/ecodeli", label: "Facebook" },
    { icon: <Twitter className="h-5 w-5" />, href: "https://twitter.com/ecodeli", label: "Twitter" },
    { icon: <Instagram className="h-5 w-5" />, href: "https://instagram.com/ecodeli", label: "Instagram" },
    { icon: <Linkedin className="h-5 w-5" />, href: "https://linkedin.com/company/ecodeli", label: "LinkedIn" },
    { icon: <Youtube className="h-5 w-5" />, href: "https://youtube.com/ecodeli", label: "YouTube" },
  ];

  const footerLinks = {
    services: [
      { label: "Livraison de colis", href: "/services/delivery" },
      { label: "Stockage", href: "/services/storage" },
      { label: "Services de proximité", href: "/services/local" },
      { label: "Services sur mesure", href: "/services/custom" },
    ],
    company: [
      { label: "À propos", href: "/about" },
      { label: "Comment ça marche", href: "/how-it-works" },
      { label: "Tarifs", href: "/pricing" },
      { label: "Nos partenaires", href: "/partners" },
    ],
    legal: [
      { label: "Conditions d'utilisation", href: "/terms" },
      { label: "Politique de confidentialité", href: "/privacy" },
      { label: "Mentions légales", href: "/legal" },
      { label: "Cookies", href: "/cookies" },
    ],
    help: [
      { label: "FAQ", href: "/help/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Support client", href: "/help" },
      { label: "Devenir livreur", href: "/become-deliverer" },
    ],
  };

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Logo and contact */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center mb-4">
              <Image 
                src="/images/logo.svg" 
                alt="EcoDeli Logo" 
                width={32} 
                height={32} 
                className="h-8 w-auto mr-2" 
              />
              <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">EcoDeli</span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 max-w-md">
              EcoDeli est une plateforme de crowdshipping qui met en relation expéditeurs et livreurs particuliers pour des livraisons plus économiques et écologiques.
            </p>
            <div className="space-y-2">
              <p className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                <Mail className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>contact@ecodeli.com</span>
              </p>
              <p className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                <Phone className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>+33 1 23 45 67 89</span>
              </p>
              <p className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                <MapPin className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span>123 Avenue de la République, 75011 Paris, France</span>
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider mb-4">
              Services
            </h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider mb-4">
              Entreprise
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wider mb-4">
              Aide
            </h3>
            <ul className="space-y-2">
              {footerLinks.help.map((link) => (
                <li key={link.label}>
                  <Link 
                    href={link.href} 
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Social Media & Bottom Row */}
        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-4 mb-4 md:mb-0">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            <p>© {currentYear} EcoDeli. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 