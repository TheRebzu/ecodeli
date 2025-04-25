import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Laptop, Smartphone, Clock, Check, X } from "lucide-react";
import { api } from "@/trpc/server";

// Marquer cette page comme dynamique pour éviter les erreurs de prérendu
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Mes sessions",
  description: "Gérez vos sessions actives et sécurisez votre compte",
};

interface SessionsPageProps {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SessionsPage({
  params,
}: SessionsPageProps) {
  const { locale } = await params;
  
  // Récupérer les sessions de l'utilisateur via TRPC
  const sessions = await api.user.getUserSessions.query();
  const currentSessionId = await api.user.getCurrentSessionId.query();

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mes sessions actives</h1>
          <p className="text-muted-foreground mt-2">
            Consultez et gérez vos sessions actives sur tous vos appareils
          </p>
        </div>
      </div>
      
      <div className="space-y-6">
        {sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <Card key={session.id} className={`overflow-hidden ${session.id === currentSessionId ? 'border-primary' : ''}`}>
              <div className="p-1 bg-gradient-to-r from-primary to-primary/30 opacity-50"></div>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  {session.deviceType === 'mobile' ? (
                    <Smartphone className="h-5 w-5 text-primary" />
                  ) : (
                    <Laptop className="h-5 w-5 text-primary" />
                  )}
                  {session.deviceName}
                  {session.id === currentSessionId && (
                    <Badge variant="outline" className="ml-2 text-xs">Session actuelle</Badge>
                  )}
                </CardTitle>
                
                {session.id !== currentSessionId && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => api.user.revokeSession.mutate({ sessionId: session.id })}
                  >
                    Déconnecter
                  </Button>
                )}
              </CardHeader>
              
              <CardContent className="pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Navigateur
                    </p>
                    <p>{session.browser} sur {session.os}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Adresse IP
                    </p>
                    <p>{session.ip}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Dernière activité
                    </p>
                    <p className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(session.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Connexion
                    </p>
                    <p>{new Date(session.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${session.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <p className="text-sm">
                    {session.isActive ? (
                      <span className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" /> 
                        Actif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <X className="h-3 w-3 text-red-500" /> 
                        Inactif
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Aucune session active trouvée
              </p>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-end mt-6">
          <Button 
            variant="destructive"
            onClick={() => api.user.revokeAllSessions.mutate()}
          >
            Déconnecter tous les autres appareils
          </Button>
        </div>
      </div>
    </div>
  );
}
