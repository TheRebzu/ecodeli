import { OpenAPIV3 } from 'openapi-types'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'EcoDeli API',
    description: `
# API EcoDeli - Plateforme de Crowdshipping et Services

EcoDeli est une plateforme innovante qui connecte clients, livreurs, commerçants et prestataires de services pour un écosystème collaboratif et durable.

## Fonctionnalités principales

### 🚚 **Livraisons Collaboratives**
- Système de matching automatique entre trajets de livreurs et demandes clients
- Validation sécurisée avec codes à 6 chiffres
- Suivi en temps réel des livraisons
- Optimisation des trajets pour réduire l'empreinte carbone

### 👥 **Gestion Multi-Rôles**
- **Clients** : Créer des annonces, réserver des services, suivre les livraisons
- **Livreurs** : Déclarer des trajets, accepter des livraisons, gérer les paiements
- **Commerçants** : Gérer les contrats, les commandes et la facturation
- **Prestataires** : Proposer des services, gérer les disponibilités, facturation automatique
- **Administrateurs** : Validation des documents, gestion de la plateforme

### 💳 **Paiements & Facturation**
- Intégration Stripe pour paiements sécurisés
- Portefeuilles électroniques pour livreurs et prestataires
- Facturation automatique mensuelle
- Gestion des remboursements

### 🔔 **Notifications en Temps Réel**
- Notifications push via OneSignal
- Alertes SMS et email
- Notifications in-app avec boutons d'action

### 🌍 **Multilingue**
- Support de 5 langues (FR, EN, ES, DE, IT)
- Localisation complète des formats de date/heure
- Adaptation culturelle des contenus

## Authentification

L'API utilise un système d'authentification basé sur des tokens JWT avec une solution custom sécurisée.

\`\`\`http
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

## Codes de Statut

- **200** - Succès
- **201** - Créé avec succès
- **400** - Requête invalide
- **401** - Non authentifié
- **403** - Accès interdit
- **404** - Ressource non trouvée
- **422** - Erreur de validation
- **500** - Erreur serveur

## Limites de taux

- **100 requêtes/minute** pour les utilisateurs authentifiés
- **20 requêtes/minute** pour les requêtes publiques
- **1000 requêtes/heure** pour les comptes premium

## Support

- **Email** : api-support@ecodeli.fr
- **Documentation** : https://docs.ecodeli.fr
- **Status** : https://status.ecodeli.fr
`,
    version: '1.0.0',
    contact: {
      name: 'EcoDeli API Support',
      email: 'api-support@ecodeli.fr',
      url: 'https://ecodeli.fr/support'
    },
    license: {
      name: 'Proprietary',
      url: 'https://ecodeli.fr/license'
    },
    termsOfService: 'https://ecodeli.fr/terms'
  },
  servers: [
    {
      url: 'https://api.ecodeli.fr/v1',
      description: 'Production'
    },
    {
      url: 'https://staging-api.ecodeli.fr/v1',
      description: 'Staging'
    },
    {
      url: 'http://windows:3000/api',
      description: 'Development'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentification et gestion des sessions'
    },
    {
      name: 'Users',
      description: 'Gestion des utilisateurs et profils'
    },
    {
      name: 'Announcements',
      description: 'Annonces de livraison et services'
    },
    {
      name: 'Deliveries',
      description: 'Gestion des livraisons'
    },
    {
      name: 'Bookings',
      description: 'Réservations de services'
    },
    {
      name: 'Payments',
      description: 'Paiements et transactions'
    },
    {
      name: 'Notifications',
      description: 'Système de notifications'
    },
    {
      name: 'Admin',
      description: 'Administration de la plateforme'
    },
    {
      name: 'Analytics',
      description: 'Statistiques et analytics'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenu via /auth/login'
      }
    },
    schemas: {
      // Schémas de base
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string' },
          role: {
            type: 'string',
            enum: ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']
          },
          isVerified: { type: 'boolean' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'email', 'role']
      },
      
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string', default: 'FR' },
          avatar: { type: 'string', format: 'uri' },
          dateOfBirth: { type: 'string', format: 'date' }
        }
      },

      // Authentification
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        },
        required: ['email', 'password']
      },

      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          user: { $ref: '#/components/schemas/User' },
          token: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' }
        }
      },

      RegisterRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          phoneNumber: { type: 'string' },
          role: {
            type: 'string',
            enum: ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']
          },
          // Champs spécifiques selon le rôle
          vehicleType: { type: 'string' },
          licensePlate: { type: 'string' },
          maxWeight: { type: 'number' },
          maxVolume: { type: 'number' },
          companyName: { type: 'string' },
          siret: { type: 'string' },
          vatNumber: { type: 'string' },
          businessName: { type: 'string' },
          specialties: {
            type: 'array',
            items: { type: 'string' }
          },
          hourlyRate: { type: 'number' },
          description: { type: 'string' }
        },
        required: ['email', 'password', 'firstName', 'lastName', 'role']
      },

      // Annonces
      Announcement: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          type: {
            type: 'string',
            enum: ['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'SHOPPING', 'HOME_SERVICE']
          },
          startLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              city: { type: 'string' },
              postalCode: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' }
            }
          },
          endLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              city: { type: 'string' },
              postalCode: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' }
            }
          },
          desiredDate: { type: 'string', format: 'date-time' },
          price: { type: 'number', minimum: 0 },
          currency: { type: 'string', default: 'EUR' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      CreateAnnouncementRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 5, maxLength: 100 },
          description: { type: 'string', minLength: 10, maxLength: 1000 },
          type: {
            type: 'string',
            enum: ['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'SHOPPING', 'HOME_SERVICE']
          },
          startLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              city: { type: 'string' },
              postalCode: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' }
            },
            required: ['address', 'city', 'postalCode']
          },
          endLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              city: { type: 'string' },
              postalCode: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' }
            },
            required: ['address', 'city', 'postalCode']
          },
          desiredDate: { type: 'string', format: 'date-time' },
          price: { type: 'number', minimum: 1 },
          packageDetails: {
            type: 'object',
            properties: {
              weight: { type: 'number', minimum: 0.1 },
              length: { type: 'number', minimum: 1 },
              width: { type: 'number', minimum: 1 },
              height: { type: 'number', minimum: 1 },
              fragile: { type: 'boolean' },
              requiresInsurance: { type: 'boolean' },
              insuredValue: { type: 'number' }
            }
          }
        },
        required: ['title', 'description', 'type', 'startLocation', 'endLocation', 'desiredDate', 'price']
      },

      // Livraisons
      Delivery: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          trackingNumber: { type: 'string' },
          status: {
            type: 'string',
            enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']
          },
          validationCode: { type: 'string', minLength: 6, maxLength: 6 },
          pickupDate: { type: 'string', format: 'date-time' },
          deliveryDate: { type: 'string', format: 'date-time' },
          price: { type: 'number' },
          delivererFee: { type: 'number' },
          platformFee: { type: 'number' },
          currentLocation: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          },
          announcement: { $ref: '#/components/schemas/Announcement' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // Paiements
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']
          },
          paymentMethod: { type: 'string' },
          stripePaymentId: { type: 'string' },
          paidAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },

      PaymentIntent: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          clientSecret: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string' }
        }
      },

      CreatePaymentIntentRequest: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['delivery', 'booking', 'subscription']
          },
          entityId: { type: 'string' },
          planType: {
            type: 'string',
            enum: ['STARTER', 'PREMIUM']
          }
        },
        required: ['type']
      },

      // Notifications
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          data: { type: 'object' },
          isRead: { type: 'boolean' },
          isPush: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          readAt: { type: 'string', format: 'date-time' }
        }
      },

      // Réponses standardisées
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' }
        }
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          error: { type: 'string' },
          details: { type: 'object' }
        }
      },

      ValidationError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
                code: { type: 'string' }
              }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Token d\'authentification manquant ou invalide',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Non authentifié',
              error: 'UNAUTHORIZED'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Accès interdit pour ce rôle',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Accès interdit',
              error: 'FORBIDDEN'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Ressource non trouvée',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: {
              success: false,
              message: 'Ressource non trouvée',
              error: 'NOT_FOUND'
            }
          }
        }
      },
      ValidationError: {
        description: 'Erreur de validation des données',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ValidationError' },
            example: {
              success: false,
              message: 'Données invalides',
              errors: [
                {
                  field: 'email',
                  message: 'Format d\'email invalide',
                  code: 'INVALID_EMAIL'
                }
              ]
            }
          }
        }
      }
    }
  },
  paths: {
    // Authentification
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connexion utilisateur',
        description: 'Authentifie un utilisateur et retourne un token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Connexion réussie',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '422': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Inscription utilisateur',
        description: 'Crée un nouveau compte utilisateur selon le rôle spécifié',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Compte créé avec succès',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' }
              }
            }
          },
          '422': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },

    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Déconnexion',
        description: 'Invalide le token JWT actuel',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Déconnexion réussie',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },

    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renouveler le token',
        description: 'Génère un nouveau token JWT',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token renouvelé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },

    // Gestion des utilisateurs
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Obtenir le profil utilisateur',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profil utilisateur',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' }
        }
      },
      put: {
        tags: ['Users'],
        summary: 'Mettre à jour le profil',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Profile' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Profil mis à jour',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '422': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },

    // Annonces
    '/api/announcements': {
      get: {
        tags: ['Announcements'],
        summary: 'Lister les annonces',
        description: 'Récupère la liste des annonces avec filtres',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'SHOPPING', 'HOME_SERVICE']
            }
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
            }
          },
          {
            name: 'city',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          }
        ],
        responses: {
          '200': {
            description: 'Liste des annonces',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Announcement' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' }
        }
      },
      post: {
        tags: ['Announcements'],
        summary: 'Créer une annonce',
        description: 'Crée une nouvelle annonce (CLIENT uniquement)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAnnouncementRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Annonce créée',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Announcement' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '422': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },

    '/api/announcements/{id}': {
      get: {
        tags: ['Announcements'],
        summary: 'Obtenir une annonce',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Détails de l\'annonce',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/Announcement' }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      },
      put: {
        tags: ['Announcements'],
        summary: 'Modifier une annonce',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateAnnouncementRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Annonce modifiée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      },
      delete: {
        tags: ['Announcements'],
        summary: 'Supprimer une annonce',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Annonce supprimée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    },

    // Livraisons
    '/api/deliveries': {
      get: {
        tags: ['Deliveries'],
        summary: 'Lister les livraisons',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED']
            }
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          }
        ],
        responses: {
          '200': {
            description: 'Liste des livraisons',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Delivery' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/api/deliveries/{id}/accept': {
      post: {
        tags: ['Deliveries'],
        summary: 'Accepter une livraison',
        description: 'Permet à un livreur d\'accepter une annonce de livraison',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Livraison acceptée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    },

    '/api/deliveries/{id}/validate': {
      post: {
        tags: ['Deliveries'],
        summary: 'Valider une livraison',
        description: 'Valide une livraison avec le code à 6 chiffres',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  validationCode: { 
                    type: 'string', 
                    minLength: 6, 
                    maxLength: 6,
                    pattern: '^[0-9]{6}$'
                  }
                },
                required: ['validationCode']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Livraison validée',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Code de validation invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },

    // Paiements
    '/api/payments/create-intent': {
      post: {
        tags: ['Payments'],
        summary: 'Créer un PaymentIntent Stripe',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePaymentIntentRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'PaymentIntent créé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { $ref: '#/components/schemas/PaymentIntent' }
                  }
                }
              }
            }
          },
          '422': { $ref: '#/components/responses/ValidationError' }
        }
      }
    },

    '/api/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Webhook Stripe',
        description: 'Endpoint pour recevoir les événements Stripe',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Webhook traité',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },

    // Notifications
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Lister les notifications',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'unread',
            in: 'query',
            schema: { type: 'boolean' }
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          }
        ],
        responses: {
          '200': {
            description: 'Liste des notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },

    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Marquer comme lue',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Notification marquée comme lue',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },

    // Administration
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'Lister tous les utilisateurs',
        description: 'Accès admin uniquement',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'role',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']
            }
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 }
          }
        ],
        responses: {
          '200': {
            description: 'Liste des utilisateurs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          },
          '403': { $ref: '#/components/responses/ForbiddenError' }
        }
      }
    },

    '/api/admin/documents/{userId}/validate': {
      post: {
        tags: ['Admin'],
        summary: 'Valider les documents d\'un utilisateur',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  documentType: { type: 'string' },
                  status: { 
                    type: 'string',
                    enum: ['APPROVED', 'REJECTED']
                  },
                  comment: { type: 'string' }
                },
                required: ['documentType', 'status']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Document validé',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': { $ref: '#/components/responses/ForbiddenError' }
        }
      }
    },

    // Analytics
    '/api/analytics/dashboard': {
      get: {
        tags: ['Analytics'],
        summary: 'Statistiques du dashboard',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'period',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['7d', '30d', '90d', '1y'],
              default: '30d'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Statistiques',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalUsers: { type: 'integer' },
                        totalDeliveries: { type: 'integer' },
                        totalRevenue: { type: 'number' },
                        avgDeliveryTime: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ]
}