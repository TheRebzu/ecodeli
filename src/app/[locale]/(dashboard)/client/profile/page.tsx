import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserIcon, MapPin, Shield } from "lucide-react";
import { api } from "@/trpc/server";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Mon profil",
  description: "Gérez vos informations personnelles et vos préférences",
};

interface ProfilePageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface Address {
  id: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export default async function ProfilePage({
  params,
}: ProfilePageProps) {
  const { locale } = await params;

  // Récupérer les données utilisateur réelles depuis l'API
  const userData = await api.user.getProfile.query();
  
  // Extraction d'informations d'adresse depuis le profil utilisateur (si disponible)
  // Dans une version future, on implémentera l'API getAddresses dans userRouter
  const userAddresses: Address[] = [];
  
  if (userData.clientProfile?.address) {
    userAddresses.push({
      id: "main",
      street: userData.clientProfile.address || "",
      city: userData.clientProfile.city || "",
      postalCode: userData.clientProfile.postalCode || "",
      country: "France", // Valeur par défaut
      isDefault: true
    });
  }
  
  // Information sur la sécurité basée sur les données de l'utilisateur
  const securitySettings = {
    twoFactorEnabled: false // Cette information sera gérée dans une future mise à jour
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Informations personnelles
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Adresses
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nom complet</label>
                  <p>{userData?.name || "Non défini"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p>{userData?.email || "Non défini"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <p>{userData?.clientProfile?.phone || "Non défini"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Membre depuis</label>
                  <p>{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "Non défini"}</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
                  onClick={() => {}}
                >
                  Modifier mes informations
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="addresses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mes adresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {userAddresses && userAddresses.length > 0 ? (
                userAddresses.map((address: Address) => (
                  <div 
                    key={address.id} 
                    className="border rounded-md p-4 flex justify-between items-start"
                  >
                    <div>
                      <p className="font-medium">{address.street}</p>
                      <p className="text-sm text-muted-foreground">
                        {address.postalCode} {address.city}, {address.country}
                      </p>
                      {address.isDefault && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full mt-2 inline-block">
                          Adresse par défaut
                        </span>
                      )}
                    </div>
                    <div className="space-x-2">
                      <button 
                        className="text-sm text-primary"
                        onClick={() => {}}
                      >
                        Modifier
                      </button>
                      <button 
                        className="text-sm text-destructive"
                        onClick={() => {}}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Vous n&apos;avez pas encore ajouté d&apos;adresse.
                </p>
              )}
              
              <div className="flex justify-end">
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm"
                  onClick={() => {}}
                >
                  Ajouter une adresse
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Mot de passe</label>
                  <p className="text-muted-foreground">••••••••••••</p>
                </div>
                
                <button 
                  className="text-sm text-primary"
                  onClick={() => {}}
                >
                  Changer mon mot de passe
                </button>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">Authentification à deux facteurs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajoutez une couche de sécurité supplémentaire à votre compte
                </p>
                
                <button 
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm"
                  onClick={() => {}}
                >
                  {securitySettings?.twoFactorEnabled 
                    ? "Désactiver l'authentification à deux facteurs" 
                    : "Activer l'authentification à deux facteurs"}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
