import { NextRequest, NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth/utils';
import { db } from '@/lib/db';
import { z } from 'zod';

const cartDropConfigSchema = z.object({
  isActive: z.boolean(),
  deliveryZones: z.array(z.object({
    postalCode: z.string().min(5).max(5),
    deliveryFee: z.number().min(0),
    maxDistance: z.number().min(1).max(50).optional()
  })),
  timeSlots: z.array(z.object({
    day: z.number().min(0).max(6), // 0 = dimanche, 6 = samedi
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean().default(true)
  })),
  maxOrdersPerSlot: z.number().min(1).max(100),
  minOrderAmount: z.number().min(0).optional(),
  avgPreparationTime: z.number().min(5).max(120).optional() // en minutes
});

/**
 * GET - Récupérer la configuration cart-drop du commerçant
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un commerçant
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        cartDropConfig: true
      }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    if (!merchant.cartDropConfig) {
      // Créer une configuration par défaut
      const defaultConfig = await db.cartDropConfig.create({
        data: {
          merchantId: merchant.id,
          isActive: false,
          deliveryZones: [],
          timeSlots: [
            // Créneaux par défaut : 9h-12h et 14h-18h du lundi au samedi
            { day: 1, startTime: "09:00", endTime: "12:00", isActive: true },
            { day: 1, startTime: "14:00", endTime: "18:00", isActive: true },
            { day: 2, startTime: "09:00", endTime: "12:00", isActive: true },
            { day: 2, startTime: "14:00", endTime: "18:00", isActive: true },
            { day: 3, startTime: "09:00", endTime: "12:00", isActive: true },
            { day: 3, startTime: "14:00", endTime: "18:00", isActive: true },
            { day: 4, startTime: "09:00", endTime: "12:00", isActive: true },
            { day: 4, startTime: "14:00", endTime: "18:00", isActive: true },
            { day: 5, startTime: "09:00", endTime: "12:00", isActive: true },
            { day: 5, startTime: "14:00", endTime: "18:00", isActive: true },
            { day: 6, startTime: "09:00", endTime: "12:00", isActive: true },
            { day: 6, startTime: "14:00", endTime: "17:00", isActive: true }
          ],
          maxOrdersPerSlot: 10
        }
      });

      return NextResponse.json({
        success: true,
        config: defaultConfig
      });
    }

    return NextResponse.json({
      success: true,
      config: merchant.cartDropConfig
    });

  } catch (error) {
    console.error('Error fetching cart-drop config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Mettre à jour la configuration cart-drop
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const configData = cartDropConfigSchema.parse(body);

    // Vérifier que l'utilisateur est un commerçant
    const merchant = await db.merchant.findUnique({
      where: { userId: user.id },
      include: {
        cartDropConfig: true
      }
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    // Valider la cohérence des créneaux horaires
    for (const slot of configData.timeSlots) {
      if (slot.startTime >= slot.endTime) {
        return NextResponse.json(
          { error: `Créneau invalide: ${slot.startTime} doit être antérieur à ${slot.endTime}` },
          { status: 400 }
        );
      }
    }

    // Mettre à jour ou créer la configuration
    const updatedConfig = await db.cartDropConfig.upsert({
      where: { merchantId: merchant.id },
      update: {
        isActive: configData.isActive,
        deliveryZones: configData.deliveryZones,
        timeSlots: configData.timeSlots,
        maxOrdersPerSlot: configData.maxOrdersPerSlot,
        updatedAt: new Date()
      },
      create: {
        merchantId: merchant.id,
        isActive: configData.isActive,
        deliveryZones: configData.deliveryZones,
        timeSlots: configData.timeSlots,
        maxOrdersPerSlot: configData.maxOrdersPerSlot
      }
    });

    // Notification de mise à jour
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Configuration Cart-Drop mise à jour',
        message: `Votre service de lâcher de chariot est maintenant ${configData.isActive ? 'activé' : 'désactivé'}`,
        priority: 'MEDIUM'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration Cart-Drop mise à jour avec succès',
      config: updatedConfig
    });

  } catch (error) {
    console.error('Error updating cart-drop config:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Données de configuration invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
