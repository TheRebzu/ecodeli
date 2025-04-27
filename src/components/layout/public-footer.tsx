'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Send,
  ArrowRight,
  Leaf,
  Award,
  Shield,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PublicFooterProps {
  locale: string;
}

export function PublicFooter({ locale }: PublicFooterProps) {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const year = new Date().getFullYear();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send this to your API
    console.log('Subscribed with:', email);
    setIsSubscribed(true);
    // Reset after 3 seconds
    setTimeout(() => {
      setEmail('');
      setIsSubscribed(false);
    }, 3000);
  };

  // Footer sections
  const sections = [
    {
      title: 'Services',
      links: [
        { href: '/shipping', label: 'Livraison' },
        { href: '/services', label: 'Services' },
        { href: '/pricing', label: 'Tarifs' },
        { href: '/become-delivery', label: 'Devenir livreur' },
      ],
    },
    {
      title: 'Entreprise',
      links: [
        { href: '/about', label: 'À propos' },
        { href: '/contact', label: 'Contact' },
        { href: '/faq', label: 'FAQ' },
      ],
    },
    {
      title: 'Légal',
      links: [
        { href: '/terms', label: 'Conditions d&apos;utilisation' },
        { href: '/privacy', label: 'Politique de confidentialité' },
      ],
    },
  ];

  // Certifications and accreditations
  const certifications = [
    {
      name: 'Eco-Cert',
      logo: <Leaf className="h-6 w-6" />,
      tooltip: 'Certification écologique pour nos pratiques responsables',
    },
    {
      name: 'ISO 14001',
      logo: <Award className="h-6 w-6" />,
      tooltip: 'Certification de management environnemental',
    },
    {
      name: 'RGPD',
      logo: <Shield className="h-6 w-6" />,
      tooltip: 'Conforme au Règlement Général sur la Protection des Données',
    },
  ];

  return (
    <footer className="border-t bg-background pt-16 pb-8">
      <div className="container max-w-6xl mx-auto px-4 space-y-16">
        {/* Top section with newsletter signup */}
        <div className="text-center max-w-3xl mx-auto">
          <Card className="overflow-hidden bg-primary/5 border-primary/20 shadow-sm">
            <CardContent className="p-8 md:p-10 flex flex-col items-center gap-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-medium">Restez informés</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Inscrivez-vous à notre newsletter pour recevoir nos actualités et offres
                  spéciales. Nous respectons votre vie privée et ne partagerons jamais vos données.
                </p>
              </div>
              <form
                onSubmit={handleSubscribe}
                className="w-full max-w-md flex flex-col sm:flex-row gap-3"
              >
                {!isSubscribed ? (
                  <>
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      className="group transition-all duration-300 hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-1" />
                      S&apos;inscrire
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-center py-2 px-4 bg-green-500/10 text-green-600 rounded-md border border-green-500/20">
                    <p className="text-sm font-medium flex items-center justify-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                      Merci pour votre inscription !
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 justify-items-center text-center md:text-left md:justify-items-start">
          {/* Company info */}
          <div className="space-y-6 flex flex-col items-center md:items-start max-w-xs">
            <div className="flex flex-col md:flex-row items-center gap-2">
              <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-bold text-lg">E</span>
              </div>
              <span className="font-bold text-xl mt-2 md:mt-0">EcoDeli</span>
            </div>
            <div className="text-sm text-muted-foreground">
              La livraison écologique et responsable pour vos commerces. Notre mission : réduire
              l&apos;impact environnemental tout en offrant un service de qualité.
            </div>
            <div className="space-y-3 text-sm flex flex-col items-center md:items-start">
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors group"
              >
                <MapPin className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span>123 Rue Écologique, 75001 Paris</span>
              </a>
              <a
                href="tel:+33123456789"
                className="flex items-center gap-2 hover:text-primary transition-colors group"
              >
                <Phone className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span>+33 1 23 45 67 89</span>
              </a>
              <a
                href="mailto:contact@ecodeli.com"
                className="flex items-center gap-2 hover:text-primary transition-colors group"
              >
                <Mail className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span>contact@ecodeli.com</span>
              </a>
            </div>
          </div>

          {/* Navigation sections */}
          {sections.map(section => (
            <div
              key={section.title}
              className="space-y-4 flex flex-col items-center md:items-start"
            >
              <div className="text-sm font-medium uppercase tracking-wider">{section.title}</div>
              <ul className="space-y-3 text-sm">
                {section.links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={`/${locale}${link.href}`}
                      className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
                    >
                      <ArrowRight className="h-3 w-3 mr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="text-sm font-medium uppercase tracking-wider mb-3">Suivez-nous</div>
          <div className="flex gap-4">
            <Link
              href="#"
              aria-label="Facebook"
              className="text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-primary/10 p-3 rounded-full transform hover:scale-110 duration-300"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              aria-label="Twitter"
              className="text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-primary/10 p-3 rounded-full transform hover:scale-110 duration-300"
            >
              <Twitter className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              aria-label="Instagram"
              className="text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-primary/10 p-3 rounded-full transform hover:scale-110 duration-300"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="#"
              aria-label="LinkedIn"
              className="text-muted-foreground hover:text-primary transition-colors bg-muted/50 hover:bg-primary/10 p-3 rounded-full transform hover:scale-110 duration-300"
            >
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Certifications and badges */}
        <div className="border-t border-b py-8 my-2 flex flex-col items-center">
          <div className="flex flex-col items-center gap-4 max-w-3xl text-center">
            <div className="text-sm text-muted-foreground mb-2">
              Accréditations et certifications
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <TooltipProvider>
                {certifications.map(cert => (
                  <Tooltip key={cert.name}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="py-2 px-4 gap-2 flex items-center hover:border-primary cursor-help"
                      >
                        {cert.logo}
                        <span>{cert.name}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{cert.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>© {year} EcoDeli. Tous droits réservés.</span>
            <span className="flex items-center">
              <span className="mx-2">•</span>
              Fait avec <Heart className="h-3 w-3 mx-1 text-red-500" /> en France
            </span>
          </div>

          <div className="text-xs text-muted-foreground flex flex-wrap justify-center gap-4">
            <Link href={`/${locale}/privacy`} className="hover:text-primary transition-colors">
              Politique de cookies
            </Link>
            <span>|</span>
            <Link href={`/${locale}/terms`} className="hover:text-primary transition-colors">
              Mentions légales
            </Link>
            <span>|</span>
            <Link href={`/${locale}/contact`} className="hover:text-primary transition-colors">
              Nous contacter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
