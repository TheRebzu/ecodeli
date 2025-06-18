"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Globe, 
  User, 
  ChevronRight,
  Smartphone,
  Lock,
  Languages,
  Palette
} from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: userPreferences } = api.auth.getUserPreferences.useQuery();

  const settingsSections = [
    {
      title: "Compte et profil",
      description: "Gérez vos informations personnelles",
      icon: User,
      href: "/settings/profile",
      badge: null
    },
    {
      title: "Sécurité",
      description: "Mots de passe, 2FA et confidentialité",
      icon: Shield,
      href: "/settings/security",
      badge: userPreferences?.twoFactorEnabled ? null : "Action requise"
    },
    {
      title: "Notifications",
      description: "Préférences de notifications",
      icon: Bell,
      href: "/settings/notifications",
      badge: null
    },
    {
      title: "Langue et région",
      description: "Langue d'affichage et localisation",
      icon: Languages,
      href: "/settings/language",
      badge: null
    },
    {
      title: "Thème et apparence",
      description: "Mode sombre, couleurs et affichage",
      icon: Palette,
      href: "/settings/appearance",
      badge: null
    }
  ];

  const integrationSections = [
    {
      title: "Applications mobiles",
      description: "Téléchargez nos applications",
      icon: Smartphone,
      href: "/settings/mobile",
      badge: "Nouveau"
    },
    {
      title: "API et intégrations",
      description: "Clés API et webhooks",
      icon: Globe,
      href: "/settings/api",
      badge: null
    },
    {
      title: "Confidentialité des données",
      description: "Contrôlez vos données personnelles",
      icon: Lock,
      href: "/settings/privacy",
      badge: null
    }
  ];

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>
      </div>

      {/* Aperçu du compte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Votre compte
          </CardTitle>
          <CardDescription>
            Informations générales sur votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{session?.user?.name || "Utilisateur"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-green-600">
                {session?.user?.role || "Utilisateur"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Compte {userPreferences?.twoFactorEnabled ? "sécurisé" : "standard"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paramètres principaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Paramètres principaux
          </CardTitle>
          <CardDescription>
            Configurez votre expérience EcoDeli
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsSections.map((section, index) => (
            <Link key={index} href={section.href}>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <section.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {section.badge && (
                    <Badge variant={section.badge === "Action requise" ? "destructive" : "secondary"} className="text-xs">
                      {section.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Separator />

      {/* Intégrations et avancé */}
      <Card>
        <CardHeader>
          <CardTitle>Intégrations et options avancées</CardTitle>
          <CardDescription>
            Applications externes et paramètres avancés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {integrationSections.map((section, index) => (
            <Link key={index} href={section.href}>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <section.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {section.badge && (
                    <Badge variant="outline" className="text-xs">
                      {section.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Raccourcis vers les actions courantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/settings/security">
                <Shield className="mr-2 h-4 w-4" />
                Changer mot de passe
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/settings/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Gérer notifications
              </Link>
            </Button>
            
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/help">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Centre d'aide
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
