"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { cn } from "@/lib/utils/common";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Phone,
  Mail} from "lucide-react";

interface MainFooterProps {
  locale?: string;
  showSocialLinks?: boolean;
  showContactInfo?: boolean;
  showLegalLinks?: boolean;
  showLanguageSwitcher?: boolean;
  showThemeToggle?: boolean;
  className?: string;
  companyName?: string;
  year?: number;
}

export function MainFooter({
  locale = "fr",
  showSocialLinks = true,
  showContactInfo = true,
  showLegalLinks = true,
  showLanguageSwitcher = true,
  showThemeToggle = true,
  className,
  companyName = "EcoDeli",
  year = new Date().getFullYear()}: MainFooterProps) {
  return (
    <footer className={cn("bg-background border-t py-6", className)}>
      <div className="container px-4 mx-auto">
        {/* Contenu principal du footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Colonne 1: À propos */}
          <div>
            <h3 className="font-semibold text-sm mb-3">À propos</h3>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href={`/${locale}/about`} className="hover:underline">
                Notre mission
              </Link>
              <Link href={`/${locale}/about#team`} className="hover:underline">
                Notre équipe
              </Link>
              <Link
                href={`/${locale}/about#values`}
                className="hover:underline"
              >
                Nos valeurs
              </Link>
              <Link href={`/${locale}/about#eco`} className="hover:underline">
                Engagement écologique
              </Link>
            </div>
          </div>

          {/* Colonne 2: Services */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Services</h3>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link
                href={`/${locale}/services/delivery`}
                className="hover:underline"
              >
                Livraison écologique
              </Link>
              <Link
                href={`/${locale}/services/storage`}
                className="hover:underline"
              >
                Stockage durable
              </Link>
              <Link
                href={`/${locale}/services/recycling`}
                className="hover:underline"
              >
                Solutions de recyclage
              </Link>
              <Link
                href={`/${locale}/become-delivery`}
                className="hover:underline"
              >
                Devenir livreur
              </Link>
            </div>
          </div>

          {/* Colonne 3: Support */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Support</h3>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href={`/${locale}/faq`} className="hover:underline">
                FAQ
              </Link>
              <Link href={`/${locale}/contact`} className="hover:underline">
                Contact
              </Link>
              <Link href={`/${locale}/pricing`} className="hover:underline">
                Tarification
              </Link>
              <Link href={`/${locale}/shipping`} className="hover:underline">
                Expédition
              </Link>
            </div>
          </div>

          {/* Colonne 4: Contact et Social */}
          {(showContactInfo || showSocialLinks) && (
            <div>
              {showContactInfo && (
                <>
                  <h3 className="font-semibold text-sm mb-3">Contact</h3>
                  <div className="flex flex-col space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>+33 1 23 45 67 89</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a
                        href="mailto:contact@ecodeli.me"
                        className="hover:underline"
                      >
                        contact@ecodeli.me
                      </a>
                    </div>
                  </div>
                </>
              )}

              {showSocialLinks && (
                <>
                  <h3 className="font-semibold text-sm mb-3">Suivez-nous</h3>
                  <div className="flex space-x-3">
                    <a
                      href="https://facebook.com"
                      target="blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                    <a
                      href="https://twitter.com"
                      target="blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                    <a
                      href="https://instagram.com"
                      target="blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                    <a
                      href="https://youtube.com"
                      target="blank"
                      rel="noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Youtube className="h-5 w-5" />
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6 flex flex-col-reverse md:flex-row md:justify-between md:items-center gap-4">
          {/* Copyright et liens légaux */}
          <div className="text-sm text-muted-foreground">
            <p>
              © {year} {companyName}. Tous droits réservés.
            </p>

            {showLegalLinks && (
              <div className="flex flex-wrap gap-4 mt-2">
                <Link
                  href={`/${locale}/terms`}
                  className="hover:underline text-xs"
                >
                  Conditions d'utilisation
                </Link>
                <Link
                  href={`/${locale}/privacy`}
                  className="hover:underline text-xs"
                >
                  Politique de confidentialité
                </Link>
                <Link
                  href={`/${locale}/cookies`}
                  className="hover:underline text-xs"
                >
                  Cookies
                </Link>
              </div>
            )}
          </div>

          {/* Sélecteur de langue et thème */}
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            {showLanguageSwitcher && <LanguageSwitcher locale={locale} />}
            {showThemeToggle && <ModeToggle />}
          </div>
        </div>
      </div>
    </footer>
  );
}
