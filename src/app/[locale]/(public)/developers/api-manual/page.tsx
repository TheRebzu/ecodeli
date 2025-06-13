"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManualAPIDocsPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Documentation API Manuelle"
        description="Documentation de l'API EcoDeli - Version de secours en attendant la résolution des problèmes techniques"
      />

      <div className="grid gap-6">
        {/* Status Banner */}
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-yellow-700 border-yellow-300"
            >
              ⚠️ Documentation temporaire
            </Badge>
            <p className="text-sm text-yellow-800">
              La documentation Swagger interactive est temporairement
              indisponible. Cette page fournit les informations essentielles
              pour utiliser l'API.
            </p>
          </div>
        </Card>

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="auth">Authentification</TabsTrigger>
            <TabsTrigger value="announcements">Annonces</TabsTrigger>
            <TabsTrigger value="deliveries">Livraisons</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* Authentication */}
          <TabsContent value="auth" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Authentification</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">
                    Méthodes d'authentification
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      • <strong>Session Cookies :</strong> NextAuth.js avec
                      cookies HTTP-only
                    </li>
                    <li>
                      • <strong>JWT Bearer :</strong> Pour les intégrations API
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">
                    Endpoints d'authentification
                  </h4>

                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>POST</Badge>
                        <code className="text-sm">/api/auth/signin</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Connexion utilisateur
                      </p>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                        {`// Body
{
  "email": "user@example.com",
  "password": "password123",
  "csrfToken": "csrf_token_here"
}

// Response
{
  "url": "/dashboard",
  "ok": true
}`}
                      </pre>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>GET</Badge>
                        <code className="text-sm">/api/auth/session</code>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Obtenir la session actuelle
                      </p>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                        {`// Response
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CLIENT",
    "isVerified": true
  },
  "expires": "2024-01-01T00:00:00Z"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Announcements */}
          <TabsContent value="announcements" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Annonces (tRPC)</h3>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/client.announcements.list
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Lister les annonces du client
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
POST /api/trpc/client.announcements.list
Content-Type: application/json

{
  "input": {
    "page": 1,
    "limit": 10,
    "status": ["PUBLISHED", "IN_PROGRESS"],
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}

// Response
{
  "result": {
    "data": {
      "items": [
        {
          "id": "announcement_id",
          "title": "Livraison urgente",
          "description": "Description de l'annonce",
          "type": "DELIVERY",
          "status": "PUBLISHED",
          "pricing": {
            "amount": 25.50,
            "currency": "EUR"
          },
          "pickupAddress": {
            "street": "123 Rue de la Paix",
            "city": "Paris",
            "postalCode": "75001"
          },
          "deliveryAddress": {
            "street": "456 Avenue des Champs",
            "city": "Lyon",
            "postalCode": "69001"
          },
          "createdAt": "2024-01-01T10:00:00Z"
        }
      ],
      "meta": {
        "page": 1,
        "limit": 10,
        "total": 25,
        "totalPages": 3,
        "hasNext": true,
        "hasPrev": false
      }
    }
  }
}`}
                  </pre>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/client.announcements.create
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Créer une nouvelle annonce
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
{
  "input": {
    "type": "DELIVERY",
    "title": "Livraison urgente",
    "description": "Description détaillée",
    "pickupAddress": {
      "street": "123 Rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "latitude": 48.8566,
      "longitude": 2.3522
    },
    "deliveryAddress": {
      "street": "456 Avenue des Champs",
      "city": "Lyon",
      "postalCode": "69001"
    },
    "price": 25.50,
    "weight": 2.5,
    "preferredDate": "2024-01-02T14:00:00Z"
  }
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Deliveries */}
          <TabsContent value="deliveries" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Livraisons</h3>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/deliverer.announcements.search
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Rechercher des annonces à livrer
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
{
  "input": {
    "page": 1,
    "limit": 20,
    "type": "DELIVERY",
    "minPrice": 10,
    "maxPrice": 100,
    "maxDistance": 50,
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522
    }
  }
}`}
                  </pre>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/deliverer.delivery.updateLocation
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Mettre à jour la position du livreur
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
{
  "input": {
    "deliveryId": "delivery_id",
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Services */}
          <TabsContent value="services" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Services</h3>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/client.services.search
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Rechercher des services
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
{
  "input": {
    "categoryId": "category_id",
    "location": {
      "latitude": 48.8566,
      "longitude": 2.3522
    },
    "radius": 10,
    "availability": {
      "date": "2024-01-02",
      "timeSlot": "morning"
    }
  }
}`}
                  </pre>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/client.services.book
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Réserver un service
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
{
  "input": {
    "serviceId": "service_id",
    "providerId": "provider_id",
    "scheduledDate": "2024-01-02T14:00:00Z",
    "location": {
      "address": "123 Rue de la Paix",
      "city": "Paris",
      "postalCode": "75001"
    },
    "notes": "Instructions spéciales"
  }
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Admin */}
          <TabsContent value="admin" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Administration</h3>

              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">/api/trpc/admin.users.list</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Lister les utilisateurs (Admin seulement)
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Request
{
  "input": {
    "page": 1,
    "limit": 50,
    "role": "CLIENT",
    "status": "ACTIVE",
    "search": "john@example.com"
  }
}`}
                  </pre>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>POST</Badge>
                    <code className="text-sm">
                      /api/trpc/admin.stats.dashboard
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Statistiques du tableau de bord admin
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {`// Response
{
  "result": {
    "data": {
      "users": {
        "total": 1250,
        "active": 1100,
        "newThisMonth": 85
      },
      "deliveries": {
        "total": 5420,
        "completed": 5200,
        "inProgress": 220
      },
      "revenue": {
        "thisMonth": 125400,
        "lastMonth": 118200,
        "growth": 6.1
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Reference */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Référence Rapide</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">URLs importantes</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  • <strong>API Base:</strong>{" "}
                  <code>http://localhost:3000/api</code>
                </li>
                <li>
                  • <strong>tRPC:</strong> <code>/api/trpc/[procedure]</code>
                </li>
                <li>
                  • <strong>Auth:</strong> <code>/api/auth/[action]</code>
                </li>
                <li>
                  • <strong>OpenAPI:</strong> <code>/api/openapi</code>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">Codes de statut</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  • <strong>200:</strong> Succès
                </li>
                <li>
                  • <strong>400:</strong> Erreur de validation
                </li>
                <li>
                  • <strong>401:</strong> Non authentifié
                </li>
                <li>
                  • <strong>403:</strong> Accès interdit
                </li>
                <li>
                  • <strong>404:</strong> Ressource non trouvée
                </li>
                <li>
                  • <strong>500:</strong> Erreur serveur
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Status Check */}
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                Documentation Swagger
              </h4>
              <p className="text-sm text-blue-700">
                Vérifiez régulièrement si la documentation interactive est de
                nouveau disponible
              </p>
            </div>
            <a
              href="/fr/developers/api-docs"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Tester Swagger →
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
