import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { z } from 'zod';

const opportunitiesFiltersSchema = z.object({
  page: z.string().nullable().transform(val => val ? parseInt(val) : 1).pipe(z.number().min(1)),
  limit: z.string().nullable().transform(val => val ? parseInt(val) : 20).pipe(z.number().min(1).max(50)),
  maxDistance: z.string().nullable().transform(val => val ? parseInt(val) : 50).pipe(z.number().min(1).max(100)),
  minPrice: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().min(0).optional()),
  maxPrice: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().min(0).optional()),
  type: z.string().nullable().optional(),
  urgentOnly: z.string().nullable().transform(val => val === 'true').pipe(z.boolean()),
  sortBy: z.string().nullable().transform(val => val || 'createdAt').pipe(z.enum(['distance', 'price', 'createdAt'])),
  sortOrder: z.string().nullable().transform(val => val || 'desc').pipe(z.enum(['asc', 'desc']))
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['DELIVERER']);
    const { searchParams } = new URL(request.url);
    const params = opportunitiesFiltersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      maxDistance: searchParams.get('maxDistance'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      type: searchParams.get('type'),
      urgentOnly: searchParams.get('urgentOnly'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    });

    const deliverer = await db.deliverer.findUnique({
      where: { userId: user.id },
      include: {
        user: { select: { id: true, profile: { select: { city: true, address: true } } } }
      }
    });
    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur non trouvé' }, { status: 404 });
    }

    const where: any = { status: 'ACTIVE' };
    if (params.type) where.type = params.type;
    if (params.urgentOnly) where.isUrgent = true;
    if (params.minPrice || params.maxPrice) {
      where.basePrice = {};
      if (params.minPrice) where.basePrice.gte = params.minPrice;
      if (params.maxPrice) where.basePrice.lte = params.maxPrice;
    }

    const announcements = await db.announcement.findMany({
      where,
      include: {
        author: { include: { profile: { select: { firstName: true, lastName: true, avatar: true } } } },
        PackageAnnouncement: { select: { weight: true, length: true, width: true, height: true, fragile: true, insuredValue: true } },
        delivery: { select: { id: true, delivererId: true, status: true } },
        matches: { where: { delivererId: user.id }, select: { id: true, status: true } },
        _count: { select: { matches: true, reviews: true, attachments: true, tracking: true } }
      },
      orderBy: params.sortBy === 'createdAt' ? { createdAt: params.sortOrder } :
               params.sortBy === 'price' ? { basePrice: params.sortOrder } :
               { createdAt: 'desc' },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    });

    // Filtrage JS pour éviter les erreurs Prisma sur les relations optionnelles
    const filteredAnnouncements = announcements.filter(a => {
      if (a.delivery && (a.delivery.delivererId === user.id || ['ACCEPTED', 'IN_PROGRESS'].includes(a.delivery.status))) return false;
      if (a.matches && a.matches.length > 0) return false;
      return true;
    });

    // Calcul de la distance simulée (à remplacer par géoloc réelle)
    const delivererLat = 48.8566;
    const delivererLng = 2.3522;
    const opportunitiesWithDistance = filteredAnnouncements.map(announcement => {
      const distance = calculateDistance(
        delivererLat,
        delivererLng,
        announcement.pickupLatitude || 48.8566,
        announcement.pickupLongitude || 2.3522
      );
      return {
        id: announcement.id,
        title: announcement.title,
        description: announcement.description,
        type: announcement.type,
        status: announcement.status,
        basePrice: Number(announcement.basePrice),
        finalPrice: Number(announcement.finalPrice || announcement.basePrice),
        currency: announcement.currency,
        isUrgent: announcement.isUrgent,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        createdAt: announcement.createdAt.toISOString(),
        distance: Math.round(distance * 10) / 10,
        estimatedEarnings: Number(announcement.basePrice),
        client: {
          id: announcement.author.id,
          name: announcement.author.profile ? `${announcement.author.profile.firstName || ''} ${announcement.author.profile.lastName || ''}`.trim() : announcement.author.email,
          avatar: announcement.author.profile?.avatar
        }
      };
    });

    const finalOpportunities = opportunitiesWithDistance.filter(opp => opp.distance <= params.maxDistance);
    if (params.sortBy === 'distance') {
      finalOpportunities.sort((a, b) => params.sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance);
    }

    return NextResponse.json({
      opportunities: finalOpportunities,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: finalOpportunities.length,
        totalPages: Math.ceil(finalOpportunities.length / params.limit),
        hasNext: params.page < Math.ceil(finalOpportunities.length / params.limit),
        hasPrev: params.page > 1
      },
      stats: {
        totalOpportunities: finalOpportunities.length,
        urgentCount: finalOpportunities.filter(o => o.isUrgent).length,
        averagePrice: finalOpportunities.length > 0 ? finalOpportunities.reduce((sum, o) => sum + o.basePrice, 0) / finalOpportunities.length : 0
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération opportunités:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
} 