import Link from "next/link"
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const legalLinks = [
  {
    title: "Conditions d'utilisation",
    href: "/legal/terms",
  },
  {
    title: "Mentions légales",
    href: "/legal/mentions",
  },
  {
    title: "Politique de confidentialité",
    href: "/legal/privacy",
  },
  {
    title: "RGPD",
    href: "/legal/gdpr",
  },
]

const companyLinks = [
  {
    title: "À propos",
    href: "/about",
  },
  {
    title: "Services",
    href: "/services",
  },
  {
    title: "Tarifs",
    href: "/pricing",
  },
  {
    title: "Contact",
    href: "/contact",
  },
]

export default function PublicFooter() {
  return (
    <footer className="bg-muted/40 border-t">
      <div className="container px-4 py-12 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* À propos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">EcoDeli</h3>
            <p className="text-sm text-muted-foreground">
              Plateforme de crowdshipping écologique et responsable pour des livraisons économiques et durables.
            </p>
            <div className="flex space-x-3 mt-4">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Linkedin className="h-4 w-4" />
                <span className="sr-only">LinkedIn</span>
              </Button>
            </div>
          </div>
          
          {/* Liens rapides */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens utiles</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Coordonnées */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <span className="text-sm text-muted-foreground">
                  15 Rue de l&apos;Innovation<br />
                  75001 Paris, France
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">contact@ecodeli.fr</span>
              </li>
            </ul>
          </div>
          
          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Recevez nos actualités et offres spéciales.
            </p>
            <form className="flex space-x-2">
              <Input 
                type="email" 
                placeholder="Votre email" 
                className="max-w-[220px]" 
                required
              />
              <Button type="submit">S&apos;abonner</Button>
            </form>
          </div>
        </div>
        
        {/* Bas de page */}
        <div className="mt-12 pt-6 border-t flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} EcoDeli. Tous droits réservés.
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
} 