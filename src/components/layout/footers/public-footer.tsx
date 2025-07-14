"use client";

/**
 * Footer public refactorisé pour EcoDeli
 * Version complète pour les pages publiques avec toutes les informations
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Package,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Heart,
  ArrowRight,
  CheckCircle2,
  Warehouse,
  Users,
  Truck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { type PublicFooterProps } from "../types/layout.types";

// Informations sur les 6 entrepôts EcoDeli
const warehouses = [
  { city: "Paris", region: "Île-de-France", status: "Opérationnel" },
  { city: "Lyon", region: "Auvergne-Rhône-Alpes", status: "Opérationnel" },
  {
    city: "Marseille",
    region: "Provence-Alpes-Côte d'Azur",
    status: "Opérationnel",
  },
  { city: "Toulouse", region: "Occitanie", status: "Opérationnel" },
  { city: "Nantes", region: "Pays de la Loire", status: "En construction" },
  { city: "Lille", region: "Hauts-de-France", status: "Prévu 2025" },
];

// Statistiques EcoDeli
const stats = [
  { icon: Users, label: "Utilisateurs actifs", value: "10,000+" },
  { icon: Truck, label: "Livraisons réalisées", value: "50,000+" },
  { icon: Warehouse, label: "Entrepôts", value: "6" },
  { icon: Star, label: "Note moyenne", value: "4.8/5" },
];

export function PublicFooter({
  variant = "full",
  showSocial = true,
  showWarehouseInfo = true,
  className,
}: PublicFooterProps) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  const footer = useTranslations("footer");

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // TODO: Intégrer avec l'API newsletter
    try {
      // Simulation d'appel API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubscribed(true);
      setEmail("");
    } catch (error) {
      console.error("Erreur lors de l'inscription à la newsletter:", error);
    }
  };

  // Version minimale pour les dashboards
  if (variant === "minimal") {
    return (
      <footer
        className={cn("border-t border-border bg-muted/30 py-4", className)}
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-semibold">EcoDeli</span>
              <span className="text-muted-foreground">
                © 2024 - Tous droits réservés
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle variant="icon-only" />
              <LanguageSwitcher variant="minimal" />
              <Link
                href="/legal/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Confidentialité
              </Link>
              <Link
                href="/support"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Version complète pour les pages publiques
  return (
    <footer className={cn("bg-gray-900 text-gray-300", className)}>
      <div className="container mx-auto px-4 py-12">
        {/* Statistiques et Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Statistiques */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-8 text-white">
            <h3 className="text-2xl font-bold mb-6">EcoDeli en chiffres</h3>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <stat.icon className="h-8 w-8 mx-auto mb-2 text-white/90" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="bg-gray-800 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Restez informé
            </h3>
            <p className="text-gray-400 mb-6">
              Recevez nos dernières actualités et offres exclusives directement
              dans votre boîte mail.
            </p>

            {subscribed ? (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>
                  Merci ! Vous êtes maintenant abonné à notre newsletter.
                </span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    S'abonner
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  En vous abonnant, vous acceptez notre politique de
                  confidentialité.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Informations entrepôts */}
        {showWarehouseInfo && (
          <div className="mb-12">
            <h3 className="text-xl font-bold text-white mb-6 text-center">
              Notre réseau d'entrepôts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {warehouses.map((warehouse, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">
                      {warehouse.city}
                    </h4>
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        warehouse.status === "Opérationnel"
                          ? "bg-green-500"
                          : warehouse.status === "En construction"
                            ? "bg-yellow-500"
                            : "bg-gray-500",
                      )}
                    />
                  </div>
                  <p className="text-sm text-gray-400">{warehouse.region}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {warehouse.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liens principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Informations entreprise */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Package className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-white">EcoDeli</span>
            </div>
            <p className="text-gray-400 mb-4">
              La plateforme de crowdshipping éco-responsable qui révolutionne la
              livraison collaborative.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-green-600" />
                <a
                  href="mailto:contact@ecodeli.com"
                  className="text-sm hover:text-white transition-colors"
                >
                  contact@ecodeli.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="text-sm">+33 1 23 45 67 89</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm">Paris, France</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/services/delivery"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Livraisons écologiques
                </Link>
              </li>
              <li>
                <Link
                  href="/services/personal"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Services à la personne
                </Link>
              </li>
              <li>
                <Link
                  href="/services/storage"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Stockage intelligent
                </Link>
              </li>
              <li>
                <Link
                  href="/partners/merchants"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Partenaires commerçants
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Tarifs
                </Link>
              </li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="text-white font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  À propos
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Carrières
                </Link>
              </li>
              <li>
                <Link
                  href="/press"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Presse
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/sustainability"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Développement durable
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/help"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Centre d'aide
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Nous contacter
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  CGU
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-gray-700" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
            <span className="text-gray-400 text-sm">
              © 2024 EcoDeli. Tous droits réservés.
            </span>
            <div className="flex items-center space-x-4">
              <ThemeToggle variant="icon-only" />
              <LanguageSwitcher variant="minimal" />
            </div>
          </div>

          {/* Réseaux sociaux */}
          {showSocial && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-400 text-sm mr-3">Suivez-nous :</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white h-8 w-8"
              >
                <Facebook className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white h-8 w-8"
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white h-8 w-8"
              >
                <Instagram className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white h-8 w-8"
              >
                <Linkedin className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white h-8 w-8"
              >
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Made with love */}
        <div className="text-center mt-8 pt-4 border-t border-gray-700">
          <p className="text-gray-500 text-sm flex items-center justify-center space-x-1">
            <span>Conçu avec</span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
            <span>en France</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
