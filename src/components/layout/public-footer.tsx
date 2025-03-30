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
    title: "Nos Services",
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
  {
    title: "FAQ",
    href: "/faq",
  },
]

const servicesLinks = [
  {
    title: "Livraison de colis",
    href: "/services/package-delivery",
  },
  {
    title: "Transport de personnes",
    href: "/services/people-transport",
  },
  {
    title: "Service de courses",
    href: "/services/shopping",
  },
  {
    title: "Stockage temporaire",
    href: "/services/storage",
  },
  {
    title: "Achats à l'étranger",
    href: "/services/foreign-shopping",
  },
]

const deliveryLinks = [
  {
    title: "Devenir livreur",
    href: "/become-delivery",
  },
  {
    title: "Espace livreur",
    href: "/delivery/dashboard",
  },
  {
    title: "Assurances",
    href: "/delivery/insurance",
  },
  {
    title: "Formations",
    href: "/delivery/training",
  },
]

export default function PublicFooter() {
  return (
    <footer className="bg-muted/40 border-t">
      <div className="container px-3 py-6 sm:px-4 sm:py-8 md:py-12 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* À propos */}
          <div className="mb-6 sm:mb-0">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">EcoDeli</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Plateforme de crowdshipping qui met en relation particuliers et commerçants avec des livreurs occasionnels pour des livraisons écologiques, économiques et solidaires.
            </p>
            <div className="flex space-x-2 sm:space-x-3 mt-3 sm:mt-4">
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full">
                <Facebook className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">Facebook</span>
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full">
                <Twitter className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">Twitter</span>
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full">
                <Instagram className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">Instagram</span>
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full">
                <Linkedin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">LinkedIn</span>
              </Button>
            </div>
          </div>
          
          {/* Liens entreprise */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">À propos</h3>
            <ul className="space-y-1 sm:space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Services */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Nos services</h3>
            <ul className="space-y-1 sm:space-y-2">
              {servicesLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Livreurs */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Espace livreur</h3>
            <ul className="space-y-1 sm:space-y-2">
              {deliveryLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs sm:text-sm text-muted-foreground hover:text-foreground">
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Contact</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li className="flex items-start space-x-2 sm:space-x-3">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  110 Rue de Flandre<br />
                  75019 Paris, France
                </span>
              </li>
              <li className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">contact@ecodeli.fr</span>
              </li>
            </ul>

            <h3 className="text-base sm:text-lg font-semibold mt-4 sm:mt-6 mb-3 sm:mb-4">Newsletter</h3>
            <form className="flex space-x-2">
              <Input 
                type="email" 
                placeholder="Votre email" 
                className="max-w-[160px] sm:max-w-[220px] h-8 sm:h-9 text-xs sm:text-sm" 
                required
              />
              <Button type="submit" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">OK</Button>
            </form>
          </div>
        </div>
        
        {/* Bas de page */}
        <div className="mt-6 sm:mt-8 md:mt-12 pt-4 sm:pt-6 border-t flex flex-col md:flex-row justify-between items-center">
          <div className="text-xs sm:text-sm text-muted-foreground mb-3 md:mb-0">
            &copy; {new Date().getFullYear()} EcoDeli. Tous droits réservés.
          </div>
          <ul className="flex flex-wrap justify-center gap-x-3 sm:gap-x-4 md:gap-x-6 gap-y-1 sm:gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-[10px] sm:text-xs md:text-sm text-muted-foreground hover:text-foreground">
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