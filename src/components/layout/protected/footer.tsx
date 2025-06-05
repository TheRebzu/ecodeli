'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';

interface ProtectedFooterProps {
  locale: string;
}

export function ProtectedFooter({ locale }: ProtectedFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container flex h-12 items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <p>
            © {currentYear} EcoDeli. Tous droits réservés.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Link 
            href={`/${locale}/help`}
            className="hover:text-foreground transition-colors"
          >
            Aide
          </Link>
          <Link 
            href={`/${locale}/legal/privacy`}
            className="hover:text-foreground transition-colors"
          >
            Confidentialité
          </Link>
          <Link 
            href={`/${locale}/legal/terms`}
            className="hover:text-foreground transition-colors"
          >
            Conditions
          </Link>
          <div className="flex items-center">
            <span>Fait avec</span>
            <Heart className="mx-1 h-3 w-3 fill-red-500 text-red-500" />
            <span>à Paris</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
