// Simuler PrismaClient pour le développement
import { TutorialProgress, TutorialStep } from '@/shared/types/onboarding.types'
import { PrismaWhereInput } from '@/shared/types/onboarding.types'

// Type pour les paramètres de mock
interface DataParams {
  data: Record<string, unknown>;
  where?: PrismaWhereInput;
  include?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  customer?: {
    id: string;
  };
  subscription?: {
    plan: string;
    expiresAt: Date;
    storageBoxLimit: number;
  };
}

// Créer un mock générique qui accepte n'importe quelle structure de paramètres
class MockDbMethod<T> {
  private defaultValue: T;

  constructor(defaultValue: T) {
    this.defaultValue = defaultValue;
  }

  async exec(): Promise<T> {
    return this.defaultValue;
  }
}

export class MockPrismaClient {
  // Mock pour l'authentification
  user = {
    findUnique: (params?: { where?: PrismaWhereInput }) => {
      const mockUser = {
        id: params?.where?.id?.toString() || 'demo-user',
        name: 'Demo User',
        email: params?.where?.email?.toString() || 'demo@ecodeli.com',
        password: 'demo-password',
        role: 'CUSTOMER',
        customer: {
          id: 'demo-customer'
        },
        subscription: {
          plan: 'FREE',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          storageBoxLimit: 5
        }
      };
      return Promise.resolve(mockUser as UserData);
    },
    findMany: (_?: { where?: PrismaWhereInput }) => Promise.resolve([]),
    create: (params: DataParams) => Promise.resolve(params.data as unknown as UserData),
    update: (params: DataParams) => Promise.resolve(params.data as unknown as UserData)
  };

  // Mock pour les annonces
  announcement = {
    count: (_?: { where?: PrismaWhereInput }) => Promise.resolve(0),
    findMany: (params?: { 
      where?: PrismaWhereInput;
      orderBy?: Record<string, string>;
      take?: number;
      skip?: number;
    }) => {
      if (params?.where?.customerId) {
        return Promise.resolve([{
          id: 'mock-announcement-1',
          title: 'Annonce de test 1',
          description: 'Description de test',
          status: 'DRAFT',
          customerId: params.where.customerId.toString(),
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
      return Promise.resolve([]);
    },
    findUnique: (params?: { where?: PrismaWhereInput }) => {
      if (params?.where?.id) {
        return Promise.resolve({
          id: params.where.id.toString(),
          title: 'Annonce de test',
          description: 'Description de test',
          status: 'DRAFT',
          customerId: 'demo-user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      return Promise.resolve(null);
    },
    findFirst: (params?: { where?: PrismaWhereInput }) => {
      if (params?.where?.id) {
        return Promise.resolve({
          id: params.where.id.toString(),
          title: 'Annonce de test',
          description: 'Description de test',
          status: params.where.status?.toString() || 'DRAFT',
          customerId: params.where.customerId?.toString() || 'demo-user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      return Promise.resolve(null);
    },
    create: (params: DataParams) => Promise.resolve({ 
      id: 'mock-announcement',
      ...params.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    update: (params: DataParams) => Promise.resolve({ 
      id: params.where?.id?.toString() || 'mock-announcement',
      ...params.data,
      updatedAt: new Date()
    })
  };

  // Mock pour les boîtes de stockage
  storageBox = {
    count: (_?: { where?: PrismaWhereInput }) => Promise.resolve(0),
    findMany: (_?: { where?: PrismaWhereInput }) => Promise.resolve([]),
    findFirst: (_?: { where?: PrismaWhereInput }) => Promise.resolve(null),
    create: (params: DataParams) => Promise.resolve(params.data),
    update: (params: DataParams) => Promise.resolve(params.data)
  };

  // Méthode pour simuler les requêtes au tutoriel
  userTutorialProgress = {
    findUnique: (_?: { where?: PrismaWhereInput }) => Promise.resolve(null as TutorialProgress | null),
    upsert: (data: { 
      where: PrismaWhereInput;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise.resolve(data.create as unknown as TutorialProgress),
    create: (params: DataParams) => Promise.resolve(params.data as unknown as TutorialProgress),
    update: (params: DataParams) => Promise.resolve({ 
      id: 'mock-id', 
      ...params.data,
      userId: 'user-123',
      currentStepId: params.data.currentStepId?.toString() || null,
      completedSteps: Array.isArray(params.data.completedSteps) ? params.data.completedSteps : [],
      isCompleted: Boolean(params.data.isCompleted) || false,
      lastUpdated: new Date()
    } as TutorialProgress),
    findMany: (_?: { where?: PrismaWhereInput }) => Promise.resolve([]),
    delete: (_?: { where?: PrismaWhereInput }) => Promise.resolve({
      id: 'mock-id',
      userId: 'user-123',
      currentStepId: null,
      completedSteps: [],
      isCompleted: false,
      lastUpdated: new Date()
    } as TutorialProgress)
  };

  // Méthode pour simuler les requêtes aux étapes du tutoriel
  tutorialStep = {
    findMany: (params?: { where?: PrismaWhereInput, orderBy?: Record<string, string> }) => {
      // Si on demande des étapes pour une fonctionnalité spécifique
      if (params?.where?.featureId) {
        const featureId = params.where.featureId.toString();
        
        // Retourner des étapes spécifiques à la fonctionnalité
        switch (featureId) {
          case 'announcements':
            return Promise.resolve([
              {
                id: 'announcement-create',
                title: 'Créer une annonce',
                description: 'Cliquez ici pour créer une nouvelle annonce de livraison.',
                order: 0,
                featureId: 'announcements',
                targetElementId: 'create-announcement-btn',
                position: 'bottom'
              },
              {
                id: 'announcement-filter',
                title: 'Filtrer vos annonces',
                description: 'Utilisez ces filtres pour trouver rapidement vos annonces.',
                order: 1,
                featureId: 'announcements',
                targetElementId: 'announcement-filters',
                position: 'top'
              },
              {
                id: 'announcement-status',
                title: 'Statut des annonces',
                description: 'Chaque annonce a un statut qui indique où elle en est dans le processus de livraison.',
                order: 2,
                featureId: 'announcements',
                targetElementId: 'announcement-status-badge',
                position: 'right'
              }
            ] as TutorialStep[]);
            
          case 'storage-box':
            return Promise.resolve([
              {
                id: 'storage-box-create',
                title: 'Réserver une box',
                description: 'Cliquez ici pour réserver une nouvelle box de stockage temporaire.',
                order: 0,
                featureId: 'storage-box',
                targetElementId: 'reserve-box-btn',
                position: 'bottom'
              },
              {
                id: 'storage-box-availability',
                title: 'Consulter la disponibilité',
                description: 'Vérifiez la disponibilité des box pour les dates qui vous intéressent.',
                order: 1,
                featureId: 'storage-box',
                targetElementId: 'box-availability-calendar',
                position: 'right'
              },
              {
                id: 'storage-box-details',
                title: 'Détails de la box',
                description: 'Consultez les caractéristiques et dimensions de chaque type de box.',
                order: 2,
                featureId: 'storage-box',
                targetElementId: 'box-details',
                position: 'left'
              }
            ] as TutorialStep[]);
            
          default:
            return Promise.resolve([]);
        }
      }
      
      // Par défaut, retourner les étapes du tutoriel principal
      return Promise.resolve([
        {
          id: 'step1',
          title: 'Bienvenue sur EcoDeli',
          description: 'Découvrez comment créer votre première annonce',
          order: 0,
          isCompleted: false,
          position: 'center'
        },
        {
          id: 'step2',
          title: 'Gérer vos annonces',
          description: 'Consultez et suivez vos annonces en cours',
          order: 1,
          isCompleted: false,
          targetElementId: 'announcements-menu',
          position: 'right'
        },
        {
          id: 'step3',
          title: 'Votre profil',
          description: 'Mettez à jour vos informations personnelles',
          order: 2,
          isCompleted: false,
          targetElementId: 'profile-menu',
          position: 'bottom'
        }
      ] as TutorialStep[]);
    },
    create: (params: DataParams) => Promise.resolve(params.data as unknown as TutorialStep),
    update: (params: DataParams) => Promise.resolve({ 
      id: 'mock-id', 
      ...params.data 
    } as unknown as TutorialStep)
  };

  // Méthode pour simuler les requêtes de progression des tutoriels spécifiques aux fonctionnalités
  featureTutorialProgress = {
    findUnique: (params?: { where?: PrismaWhereInput }) => {
      if (params?.where?.userId_featureId) {
        // Simuler un enregistrement existant pour certaines fonctionnalités
        const userId = params.where.userId_featureId.userId?.toString();
        const featureId = params.where.userId_featureId.featureId?.toString();
        
        if (userId && featureId) {
          // Pour les fonctionnalités déjà visitées, retourner un état de progression
          if (featureId === 'announcements') {
            return Promise.resolve({
              id: `feature-progress-${featureId}-${userId}`,
              userId,
              featureId,
              currentStepId: 'announcement-filter',
              completedSteps: ['announcement-create'],
              isCompleted: false,
              lastUpdated: new Date()
            });
          }
        }
      }
      
      // Par défaut, retourner null (aucun enregistrement trouvé)
      return Promise.resolve(null);
    },
    upsert: (data: { 
      where: PrismaWhereInput;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise.resolve(data.create as unknown),
    create: (params: DataParams) => Promise.resolve(params.data),
    update: (params: DataParams) => Promise.resolve(params.data),
    findMany: (_?: { where?: PrismaWhereInput }) => Promise.resolve([]),
    delete: (_?: { where?: PrismaWhereInput }) => Promise.resolve({
      id: 'mock-id',
      userId: 'user-123',
      featureId: 'announcements',
      currentStepId: null,
      completedSteps: [],
      isCompleted: false,
      lastUpdated: new Date()
    })
  };

  // Support pour les méthodes génériques
  $allModels = {
    findUnique: <T>() => new MockDbMethod<T>({} as T),
    findMany: <T>() => new MockDbMethod<T[]>([]),
    create: <T>() => new MockDbMethod<T>({} as T),
    update: <T>() => new MockDbMethod<T>({} as T)
  };

  // Support pour la méthode $connect
  $connect() {
    return Promise.resolve();
  }

  // Support pour la méthode $disconnect
  $disconnect() {
    return Promise.resolve();
  }
}

// Variable globale pour garder une seule instance du client
const globalForPrisma = global as unknown as { prisma: MockPrismaClient }

// Exporter le client
export const mockDb = globalForPrisma.prisma ?? new MockPrismaClient()

// Pour les environnements de développement, ajouter l'instance à la variable globale
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = mockDb
} 