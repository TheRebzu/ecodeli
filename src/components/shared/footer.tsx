import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
          <div className="col-span-2 sm:col-span-2 md:col-span-4 lg:col-span-2 xl:col-span-2 space-y-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">EcoDeli</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              La plateforme de crowdshipping qui connecte particuliers, commerçants et prestataires pour des livraisons collaboratives.
            </p>
            <div className="flex space-x-4">
              <Link href="https://facebook.com" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted">
                <Facebook size={18} />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="https://twitter.com" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted">
                <Twitter size={18} />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="https://instagram.com" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted">
                <Instagram size={18} />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="https://linkedin.com" className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted">
                <Linkedin size={18} />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Services</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/services/livraison" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Livraison de colis
              </Link>
              <Link href="/services/transport" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Transport de personnes
              </Link>
              <Link href="/services/courses" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Services de courses
              </Link>
              <Link href="/services/achats" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Achats à l&apos;étranger
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Liens utiles</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                À propos
              </Link>
              <Link href="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Tarifs
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Mentions légales</h3>
            <nav className="flex flex-col space-y-2">
              <Link href="/legal/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Politique de confidentialité
              </Link>
              <Link href="/legal/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Conditions d&apos;utilisation
              </Link>
              <Link href="/legal/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Gestion des cookies
              </Link>
              <Link href="/legal/cgv" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                CGV
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} EcoDeli. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground text-center md:text-right">
            EcoDeli SAS - 110, rue de Flandre, 75019 Paris - RCS Paris 123 456 789
          </p>
        </div>
      </div>
    </footer>
  );
}
