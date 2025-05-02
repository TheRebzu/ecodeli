'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainHeader } from './main-header';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

interface PublicHeaderProps {
  locale?: string;
  showSearch?: boolean;
}

export function PublicHeader({ locale = 'fr', showSearch = false }: PublicHeaderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Navigation principale
  const mainNav = [
    { name: 'Accueil', href: `/${locale}/home` },
    { name: 'Services', href: `/${locale}/services` },
    { name: 'Tarifs', href: `/${locale}/pricing` },
    {
      name: 'Devenir partenaire',
      children: [
        { name: 'Devenir livreur', href: `/${locale}/become-delivery` },
        { name: 'Devenir commerçant', href: `/${locale}/merchant/register` },
        { name: 'Devenir prestataire', href: `/${locale}/provider/register` },
      ],
    },
    { name: 'À propos', href: `/${locale}/about` },
    { name: 'Contact', href: `/${locale}/contact` },
  ];

  // Corps du menu principal et mobile
  const renderMenuItems = () => (
    <>
      {mainNav.map((item, index) => {
        // Si l'élément a des sous-menus
        if (item.children) {
          return (
            <DropdownMenu key={index}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 text-base font-medium">
                  {item.name}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {item.children.map((child, childIndex) => (
                  <Link href={child.href} key={childIndex} passHref>
                    <DropdownMenuItem className="cursor-pointer">{child.name}</DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        // Élément simple
        return (
          <Link key={index} href={item.href} passHref>
            <Button
              variant="ghost"
              className={cn('text-base font-medium', pathname === item.href && 'text-primary')}
            >
              {item.name}
            </Button>
          </Link>
        );
      })}
    </>
  );

  // Menu mobile
  const MobileMenu = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="max-w-xs">
        <nav className="flex flex-col gap-4 mt-8">
          {mainNav.map((item, index) => {
            // Si l'élément a des sous-menus
            if (item.children) {
              return (
                <div key={index} className="space-y-2">
                  <p className="font-medium px-4">{item.name}</p>
                  <div className="pl-4 border-l space-y-1">
                    {item.children.map((child, childIndex) => (
                      <SheetClose key={childIndex} asChild>
                        <Link href={child.href} passHref>
                          <Button variant="ghost" className="w-full justify-start">
                            {child.name}
                          </Button>
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                </div>
              );
            }

            // Élément simple
            return (
              <SheetClose key={index} asChild>
                <Link href={item.href} passHref>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start text-base',
                      pathname === item.href && 'text-primary font-medium'
                    )}
                  >
                    {item.name}
                  </Button>
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );

  // Actions
  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" asChild>
        <Link href={`/${locale}/login`}>Se connecter</Link>
      </Button>
      <Button asChild>
        <Link href={`/${locale}/register/client`}>S'inscrire</Link>
      </Button>
    </div>
  );

  return (
    <>
      <MainHeader
        locale={locale}
        title="EcoDeli"
        subtitle="Livraison écologique"
        showSearch={showSearch}
        showNotifications={false}
        showMessages={false}
        showUserMenu={false}
        className="border-b-0"
        logoHref={`/${locale}`}
        userMenuItems={null}
      />

      {/* Navigation principale */}
      <div className="border-b bg-background sticky top-16 z-30">
        <div className="container mx-auto px-4 flex items-center justify-between h-12">
          <div className="hidden md:flex items-center gap-1">{renderMenuItems()}</div>

          <MobileMenu />

          <div className="flex items-center">{actions}</div>
        </div>
      </div>
    </>
  );
}
