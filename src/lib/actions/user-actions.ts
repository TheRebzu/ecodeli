'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { getSession } from '@/lib/session-helper';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Role, DeliveryStatus, ServiceStatus } from '@prisma/client';

/**
 * Récupère les informations complètes de l'utilisateur avec un ID spécifique
 * Séparé de getCurrentUser pour éviter l'utilisation de headers dans le cache
 */
export const getUserById = unstable_cache(
  async (userId: string) => {
    if (!userId) {
      return null;
    }
    
    // Récupération de base de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      return null;
    }
    
    // Récupérer les informations additionnelles selon le rôle
    let roleData = null;
    
    switch (user.role) {
      case 'CLIENT':
        roleData = await prisma.client.findUnique({
          where: { userId },
        });
        break;
      case 'MERCHANT':
        roleData = await prisma.merchant.findUnique({
          where: { userId },
          include: {
            products: true,
          },
        });
        break;
      case 'COURIER':
        roleData = await prisma.courier.findUnique({
          where: { userId },
          include: {
            availabilities: true,
          },
        });
        break;
      case 'PROVIDER':
        roleData = await prisma.provider.findUnique({
          where: { userId },
          include: {
            availabilities: true,
          },
        });
        break;
      default:
        roleData = null;
    }
    
    return {
      ...user,
      roleData,
    };
  },
  ['user-by-id'],
  { revalidate: 60 } // Revalider le cache toutes les 60 secondes
);

/**
 * Récupère les informations complètes de l'utilisateur actuel
 * Cette fonction n'est pas mise en cache directement car elle utilise getSession
 */
export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }
  
  // Utilise la fonction mise en cache qui ne dépend pas des headers
  return getUserById(session.user.id);
}

/**
 * Récupère le tableau de bord pour un utilisateur spécifique
 * Séparé de getUserDashboardData pour éviter l'utilisation de headers dans le cache
 */
export const getDashboardDataById = unstable_cache(
  async (userId: string, userRole: Role) => {
    if (!userId) {
      return null;
    }
    
    // Données de base pour tous les tableaux de bord
    const baseData = {
      user: await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          status: true,
        },
      }),
      notifications: await prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
    };
    
    if (!baseData.user) {
      return null;
    }
    
    // Données spécifiques au rôle
    let roleSpecificData = {};
    
    switch (userRole) {
      case 'CLIENT':
        roleSpecificData = {
          shipments: await prisma.shipment.findMany({
            where: {
              clientId: userId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
            include: {
              couriers: true,
            },
          }),
          announcements: await prisma.announcement.findMany({
            where: {
              clientId: userId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          }),
        };
        break;
      case 'MERCHANT':
        const merchant = await prisma.merchant.findUnique({
          where: { userId },
        });
        
        if (!merchant) break;
        
        roleSpecificData = {
          merchantId: merchant.id,
          companyName: merchant.companyName,
          recentAnnouncements: await prisma.announcement.findMany({
            where: {
              merchantId: merchant.id,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          }),
          recentProducts: await prisma.product.findMany({
            where: {
              merchantId: merchant.id,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          }),
        };
        break;
      case 'COURIER':
        const courier = await prisma.courier.findUnique({
          where: { userId },
        });
        
        if (!courier) break;
        
        roleSpecificData = {
          courierId: courier.id,
          currentDeliveries: await prisma.shipmentCourier.findMany({
            where: {
              courierId: courier.id,
              status: {
                in: [DeliveryStatus.PENDING, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
              },
            },
            include: {
              shipment: true,
            },
            take: 5,
          }),
          completedDeliveries: await prisma.shipmentCourier.findMany({
            where: {
              courierId: courier.id,
              status: DeliveryStatus.DELIVERED,
            },
            orderBy: {
              endTime: 'desc',
            },
            include: {
              shipment: true,
            },
            take: 5,
          }),
        };
        break;
      case 'PROVIDER':
        const provider = await prisma.provider.findUnique({
          where: { userId },
        });
        
        if (!provider) break;
        
        roleSpecificData = {
          providerId: provider.id,
          activeServices: await prisma.service.findMany({
            where: {
              providerId: provider.id,
              status: {
                in: [ServiceStatus.PENDING, ServiceStatus.IN_PROGRESS],
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          }),
        };
        break;
      case 'ADMIN':
        roleSpecificData = {
          recentUsers: await prisma.user.findMany({
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          }),
          pendingApprovals: await prisma.user.findMany({
            where: {
              status: 'PENDING',
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          }),
        };
        break;
      default:
        break;
    }
    
    return {
      ...baseData,
      ...roleSpecificData,
    };
  },
  ['dashboard-data-by-id'],
  { revalidate: 60 } // Revalider le cache toutes les 60 secondes
);

/**
 * Récupère le tableau de bord de l'utilisateur actuel
 * Cette fonction n'est pas mise en cache directement car elle utilise getSession
 */
export async function getUserDashboardData() {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }
  
  const userId = session.user.id;
  const userRole = session.user.role as Role;
  
  // Utilise la fonction mise en cache qui ne dépend pas des headers
  return getDashboardDataById(userId, userRole);
}

/**
 * Mettre à jour les informations de profil de l'utilisateur
 */
export async function updateUserProfile(formData: FormData) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  const userId = session.user.id;
  
  // Extraire les données du formulaire
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;
  const city = formData.get('city') as string;
  const postalCode = formData.get('postalCode') as string;
  const country = formData.get('country') as string;
  
  // Mettre à jour les informations de l'utilisateur
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      phone,
      address,
      city,
      postalCode,
      country,
    },
  });
  
  revalidatePath('/dashboard/profile');
  return updatedUser;
} 