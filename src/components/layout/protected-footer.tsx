'use client';

import Link from 'next/link';
import { Heart, FileText, Shield, Mail, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProtectedFooterProps {
  locale: string;
}

const APP_VERSION = 'v1.0.2'; // Version à configurer dans un fichier d'environnement ou de configuration

export function ProtectedFooter({ locale }: ProtectedFooterProps) {
  const year = new Date().getFullYear();

  const footerLinks = [
    {
      href: `/${locale}/privacy`,
      label: 'Confidentialité',
      icon: Shield,
    },
    {
      href: `/${locale}/terms`,
      label: 'CGU',
      icon: FileText,
    },
    {
      href: `/${locale}/support`,
      label: 'Support',
      icon: HelpCircle,
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <footer className="border-t py-4 bg-background/95 backdrop-blur-sm text-sm">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Version et copyright */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                    {APP_VERSION}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Version du système</p>
                </TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-4 hidden md:block" />
              <span className="text-xs text-muted-foreground">© {year} EcoDeli</span>
            </div>

            <Separator orientation="vertical" className="h-4 hidden md:block" />

            {/* Liens */}
            <div className="flex items-center gap-3">
              {footerLinks.map((link, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <link.icon className="h-3 w-3" />
                      <span className="hidden md:inline">{link.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{link.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Support technique */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                  <Link href={`/${locale}/admin/support`}>
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    <span className="hidden md:inline">Support technique</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Contacter le support technique</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4" />

            {/* Langues et thème */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher locale={locale} />
              <ModeToggle />
              <span className="hidden md:flex text-xs text-muted-foreground items-center">
                <span className="mx-2">•</span>
                <span className="flex items-center gap-1">
                  Fait avec <Heart className="h-3 w-3 text-red-500" /> en France
                </span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </TooltipProvider>
  );
}
