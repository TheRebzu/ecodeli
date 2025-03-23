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
<<<<<<< HEAD
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (status === "loading") {
    return <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />;
  }

  const userRole = session?.user?.role || "CLIENT";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  if (session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0"
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
              <AvatarImage
                src={session.user?.image || ""}
                alt={session.user?.name || ""}
              />
              <AvatarFallback className="text-xs sm:text-sm">
                {getInitials(session.user?.name || "U")}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate max-w-[180px]">
                {session.user?.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate max-w-[180px]">
                {session.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {roleNavItems[userRole].items.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="cursor-pointer w-full">
                  <item.icon className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <div className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-xs sm:text-sm">Déconnexion...</span>
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Déconnexion</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link href="/login">
        <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3">
          Connexion
        </Button>
      </Link>
      <Link href="/register">
        <Button size="sm" className="h-8 text-xs sm:text-sm px-2 sm:px-3">S&apos;inscrire</Button>
      </Link>
    </div>
=======
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
>>>>>>> 5b14b134948ec7b19d55a9a8fff5829e7f796b19
  );
} 