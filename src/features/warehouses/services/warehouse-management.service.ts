import { db } from '@/lib/db'
import { z } from 'zod'

// Schémas de validation pour les entrepôts
const warehouseTransferSchema = z.object({
  announcementId: z.string(),
  fromWarehouseId: z.string().optional(),
  toWarehouseId: z.string(),
  transferType: z.enum(['INCOMING', 'OUTGOING', 'INTER_WAREHOUSE', 'STORAGE']),
  packageId: z.string().optional(),
  estimatedArrival: z.date(),
  notes: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
})

interface WarehouseCapacity {
  totalSlots: number
  occupiedSlots: number
  availableSlots: number
  volumeCapacity: number // m³
  currentVolume: number
  weightCapacity: number // kg
  currentWeight: number
}

interface PackageLocation {
  id: string
  announcementId: string
  warehouseId: string
  zone: string
  shelf: string
  position: string
  status: 'INCOMING' | 'STORED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'DISPATCHED'
  arrivalDate: Date
  expectedPickup?: Date
  storageFeePaid: boolean
}

class WarehouseManagementService {

  /**
   * Obtenir la liste des entrepôts EcoDeli avec leurs capacités
   */
  async getWarehouses(): Promise<any[]> {
    try {
      const warehouses = await db.warehouse.findMany({
        include: {
          packages: {
            where: { status: { in: ['STORED', 'PREPARING', 'READY_FOR_PICKUP'] } }
          },
          operatingHours: true
        }
      })

      return warehouses.map(warehouse => ({
        id: warehouse.id,
        name: warehouse.name,
        address: warehouse.address,
        city: warehouse.city,
        postalCode: warehouse.postalCode,
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
        isActive: warehouse.isActive,
        operatingHours: warehouse.operatingHours,
        capacity: this.calculateCapacity(warehouse),
        currentPackages: warehouse.packages.length,
        zones: warehouse.storageZones || [],
        services: warehouse.services || [],
        restrictions: warehouse.restrictions || []
      }))

    } catch (error) {
      console.error('Error fetching warehouses:', error)
      throw new Error('Erreur lors de la récupération des entrepôts')
    }
  }

  /**
   * Trouver l'entrepôt optimal pour stockage selon localisation et capacité
   */
  async findOptimalWarehouse(
    pickupLatitude: number,
    pickupLongitude: number,
    deliveryLatitude: number,
    deliveryLongitude: number,
    packageVolume: number,
    packageWeight: number
  ): Promise<string | null> {
    try {
      const warehouses = await this.getWarehouses()
      
      let bestWarehouse = null
      let bestScore = 0

      for (const warehouse of warehouses) {
        if (!warehouse.isActive) continue

        const capacity = warehouse.capacity
        if (capacity.availableSlots <= 0 || 
            capacity.volumeCapacity - capacity.currentVolume < packageVolume ||
            capacity.weightCapacity - capacity.currentWeight < packageWeight) {
          continue
        }

        // Calculer score basé sur :
        // - Distance du pickup (40%)
        // - Distance de la livraison (40%) 
        // - Capacité disponible (20%)
        const pickupDistance = this.calculateDistance(
          pickupLatitude, pickupLongitude,
          warehouse.latitude, warehouse.longitude
        )
        const deliveryDistance = this.calculateDistance(
          deliveryLatitude, deliveryLongitude,
          warehouse.latitude, warehouse.longitude
        )
        
        const avgDistance = (pickupDistance + deliveryDistance) / 2
        const distanceScore = Math.max(0, 1 - (avgDistance / 50)) // Pénalité après 50km
        
        const capacityScore = capacity.availableSlots / (capacity.totalSlots || 1)
        
        const score = (distanceScore * 0.8) + (capacityScore * 0.2)
        
        if (score > bestScore) {
          bestScore = score
          bestWarehouse = warehouse
        }
      }

      return bestWarehouse?.id || null

    } catch (error) {
      console.error('Error finding optimal warehouse:', error)
      return null
    }
  }

  /**
   * Créer un transfert vers entrepôt pour stockage temporaire
   */
  async createWarehouseTransfer(transferData: z.infer<typeof warehouseTransferSchema>): Promise<any> {
    try {
      const validatedData = warehouseTransferSchema.parse(transferData)

      // Vérifier disponibilité entrepôt
      const warehouse = await db.warehouse.findUnique({
        where: { id: validatedData.toWarehouseId },
        include: { packages: { where: { status: { in: ['STORED', 'PREPARING'] } } } }
      })

      if (!warehouse || !warehouse.isActive) {
        throw new Error('Entrepôt non disponible')
      }

      const capacity = this.calculateCapacity(warehouse)
      if (capacity.availableSlots <= 0) {
        throw new Error('Entrepôt plein')
      }

      // Créer le transfert
      const transfer = await db.$transaction(async (tx) => {
        // Créer l'enregistrement de transfert
        const newTransfer = await tx.warehouseTransfer.create({
          data: {
            ...validatedData,
            status: 'PENDING',
            trackingNumber: this.generateTrackingNumber(),
            createdAt: new Date()
          }
        })

        // Créer l'emplacement package dans l'entrepôt
        const position = await this.assignStoragePosition(validatedData.toWarehouseId)
        
        await tx.packageLocation.create({
          data: {
            transferId: newTransfer.id,
            announcementId: validatedData.announcementId,
            warehouseId: validatedData.toWarehouseId,
            zone: position.zone,
            shelf: position.shelf,
            position: position.position,
            status: 'INCOMING',
            arrivalDate: validatedData.estimatedArrival,
            storageFeePaid: false
          }
        })

        // Mettre à jour l'annonce avec info entrepôt
        await tx.announcement.update({
          where: { id: validatedData.announcementId },
          data: {
            warehouseId: validatedData.toWarehouseId,
            requiresWarehouseStorage: true,
            updatedAt: new Date()
          }
        })

        return newTransfer
      })

      // Programmer les notifications
      await this.scheduleWarehouseNotifications(transfer.id)

      return transfer

    } catch (error) {
      console.error('Error creating warehouse transfer:', error)
      throw new Error('Erreur lors de la création du transfert entrepôt')
    }
  }

  /**
   * Tracker un colis dans le système entrepôt multi-étapes
   */
  async trackPackageInWarehouse(announcementId: string): Promise<any> {
    try {
      const tracking = await db.packageLocation.findFirst({
        where: { announcementId },
        include: {
          warehouse: {
            select: { name: true, address: true, city: true }
          },
          transfer: {
            include: {
              announcement: {
                select: { title: true, pickupAddress: true, deliveryAddress: true }
              }
            }
          },
          movements: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!tracking) {
        return null
      }

      return {
        currentStatus: tracking.status,
        location: {
          warehouse: tracking.warehouse,
          zone: tracking.zone,
          shelf: tracking.shelf,
          position: tracking.position
        },
        timeline: tracking.movements.map(movement => ({
          status: movement.status,
          timestamp: movement.createdAt,
          description: movement.description,
          operator: movement.operatorId
        })),
        fees: {
          dailyStorageFee: this.calculateStorageFee(tracking.arrivalDate),
          totalFees: tracking.storageFeePaid ? 0 : this.calculateStorageFee(tracking.arrivalDate),
          feesPaid: tracking.storageFeePaid
        },
        estimatedPickup: tracking.expectedPickup
      }

    } catch (error) {
      console.error('Error tracking package in warehouse:', error)
      throw new Error('Erreur lors du suivi entrepôt')
    }
  }

  /**
   * Gérer les transferts inter-entrepôts pour optimisation
   */
  async createInterWarehouseTransfer(
    packageLocationId: string,
    targetWarehouseId: string,
    reason: string
  ): Promise<any> {
    try {
      const packageLocation = await db.packageLocation.findUnique({
        where: { id: packageLocationId },
        include: { warehouse: true, announcement: true }
      })

      if (!packageLocation) {
        throw new Error('Emplacement package introuvable')
      }

      // Vérifier capacité entrepôt cible
      const targetWarehouse = await db.warehouse.findUnique({
        where: { id: targetWarehouseId },
        include: { packages: true }
      })

      if (!targetWarehouse) {
        throw new Error('Entrepôt cible introuvable')
      }

      const capacity = this.calculateCapacity(targetWarehouse)
      if (capacity.availableSlots <= 0) {
        throw new Error('Entrepôt cible plein')
      }

      // Créer le transfert inter-entrepôt
      const transfer = await db.$transaction(async (tx) => {
        // Marquer l'ancien emplacement comme en transfert
        await tx.packageLocation.update({
          where: { id: packageLocationId },
          data: { status: 'DISPATCHED' }
        })

        // Créer nouvel emplacement dans entrepôt cible
        const newPosition = await this.assignStoragePosition(targetWarehouseId)
        
        const newLocation = await tx.packageLocation.create({
          data: {
            announcementId: packageLocation.announcementId,
            warehouseId: targetWarehouseId,
            zone: newPosition.zone,
            shelf: newPosition.shelf,
            position: newPosition.position,
            status: 'INCOMING',
            arrivalDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
            storageFeePaid: packageLocation.storageFeePaid
          }
        })

        // Enregistrer le mouvement
        await tx.packageMovement.create({
          data: {
            packageLocationId: newLocation.id,
            fromWarehouseId: packageLocation.warehouseId,
            toWarehouseId: targetWarehouseId,
            movementType: 'INTER_WAREHOUSE_TRANSFER',
            status: 'IN_TRANSIT',
            reason,
            operatorId: 'system', // À remplacer par l'ID utilisateur
            createdAt: new Date()
          }
        })

        return newLocation
      })

      return transfer

    } catch (error) {
      console.error('Error creating inter-warehouse transfer:', error)
      throw new Error('Erreur lors du transfert inter-entrepôt')
    }
  }

  /**
   * Calculer les frais de stockage selon la durée
   */
  private calculateStorageFee(arrivalDate: Date): number {
    const daysDiff = Math.ceil((Date.now() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Politique tarifaire EcoDeli
    if (daysDiff <= 2) return 0 // 2 jours gratuits
    if (daysDiff <= 7) return (daysDiff - 2) * 2 // 2€/jour jusqu'à 7 jours
    if (daysDiff <= 30) return 10 + (daysDiff - 7) * 3 // 3€/jour après 7 jours
    
    return 79 + (daysDiff - 30) * 5 // 5€/jour après 30 jours
  }

  /**
   * Assigner une position de stockage dans un entrepôt
   */
  private async assignStoragePosition(warehouseId: string): Promise<{zone: string, shelf: string, position: string}> {
    // Logique d'attribution optimisée par zone
    const occupiedPositions = await db.packageLocation.findMany({
      where: { 
        warehouseId,
        status: { in: ['STORED', 'PREPARING', 'READY_FOR_PICKUP'] }
      },
      select: { zone: true, shelf: true, position: true }
    })

    // Zones prioritaires selon type de stockage
    const zones = ['A', 'B', 'C', 'D'] // A = haute rotation, D = stockage long terme
    const shelves = ['01', '02', '03', '04', '05']
    const positions = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']

    for (const zone of zones) {
      for (const shelf of shelves) {
        for (const position of positions) {
          const isOccupied = occupiedPositions.some(p => 
            p.zone === zone && p.shelf === shelf && p.position === position
          )
          
          if (!isOccupied) {
            return { zone, shelf, position }
          }
        }
      }
    }

    throw new Error('Aucune position de stockage disponible')
  }

  /**
   * Calculer la capacité d'un entrepôt
   */
  private calculateCapacity(warehouse: any): WarehouseCapacity {
    const totalSlots = warehouse.totalSlots || 1000
    const occupiedSlots = warehouse.packages?.length || 0
    
    return {
      totalSlots,
      occupiedSlots,
      availableSlots: totalSlots - occupiedSlots,
      volumeCapacity: warehouse.volumeCapacity || 5000, // m³
      currentVolume: warehouse.packages?.reduce((sum: number, p: any) => sum + (p.volume || 0), 0) || 0,
      weightCapacity: warehouse.weightCapacity || 50000, // kg
      currentWeight: warehouse.packages?.reduce((sum: number, p: any) => sum + (p.weight || 0), 0) || 0
    }
  }

  /**
   * Calculer distance entre deux points (formule haversine simplifiée)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Générer un numéro de tracking unique
   */
  private generateTrackingNumber(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `WH${timestamp}${random}`.toUpperCase()
  }

  /**
   * Programmer les notifications automatiques pour entrepôt
   */
  private async scheduleWarehouseNotifications(transferId: string): Promise<void> {
    // À implémenter avec un job scheduler (Bull, Agenda.js, etc.)
    // Notifications à programmer :
    // - Arrivée en entrepôt
    // - Prêt pour récupération  
    // - Frais de stockage
    // - Rappel récupération
  }
}

export const warehouseManagementService = new WarehouseManagementService()