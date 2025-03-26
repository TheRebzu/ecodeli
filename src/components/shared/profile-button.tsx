"use client";

import React from "react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/shared/icons";

export function ProfileButton() {
  // Utiliser des données statiques plutôt que useSession
  const user = {
    name: "Utilisateur Demo",
    email: "utilisateur@exemple.com",
    image: null,
  };

  // Utiliser des liens statiques
  const menuItems = [
    {
      icon: Icons.dashboard,
      label: "Tableau de bord",
      href: "/dashboard",
    },
    {
      icon: Icons.user,
      label: "Profil",
      href: "/dashboard/profile",
    },
    {
      icon: Icons.message,
      label: "Messages",
      href: "/dashboard/messages",
    },
    {
      icon: Icons.settings,
      label: "Paramètres",
      href: "/dashboard/settings",
    },
  ];

  // Fonction de déconnexion simulée sans appel serveur
  const handleLogout = () => {
    // Ne fait pas d'appel réel à signOut de next-auth
    // Pour un comportement réel, on utiliserait: signOut({ redirect: true, callbackUrl: '/' })
    window.location.href = '/';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-9 w-9 rounded-full"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={user.image || ''} 
              alt={user.name || 'Avatar'}
            />
            <AvatarFallback>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map((item, index) => (
            <DropdownMenuItem key={index} asChild>
              <Link href={item.href} className="flex w-full cursor-pointer items-center">
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={handleLogout}
        >
          <Icons.logout className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 