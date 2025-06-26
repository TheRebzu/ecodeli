import { db } from '@/lib/db'
import { z } from 'zod'

interface ReverseAuctionConfig {
  announcementId: string
  initialPrice: number
  minimumPrice: number
  auctionDuration: number // en heures
  autoAcceptThreshold?: number // prix en dessous duquel acceptation auto
  maxBidders: number
}

interface BidSubmission {
  bidderId: string
  announcementId: string
  proposedPrice: number
  estimatedDeliveryTime?: number
  additionalNotes?: string
  validUntil?: Date
}

interface AuctionResult {
  announcementId: string
  winningBid?: {
    bidId: string
    bidderId: string
    proposedPrice: number
    estimatedDeliveryTime: number
    rating: number
  }
  totalBids: number
  averagePrice: number
  savingsAmount: number
  savingsPercentage: number
  auctionStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED'
}

const bidSubmissionSchema = z.object({
  proposedPrice: z.number().min(1, 'Le prix doit être supérieur à 0'),
  estimatedDeliveryTime: z.number().min(15, 'Délai minimum 15 minutes').optional(),
  additionalNotes: z.string().max(500, 'Notes limitées à 500 caractères').optional(),
  validUntil: z.date().optional()
})

const auctionConfigSchema = z.object({
  initialPrice: z.number().min(5, 'Prix initial minimum 5€'),
  minimumPrice: z.number().min(1, 'Prix minimum doit être positif'),
  auctionDuration: z.number().min(0.5).max(24, 'Durée entre 30min et 24h'),
  autoAcceptThreshold: z.number().optional(),
  maxBidders: z.number().min(3).max(20, 'Entre 3 et 20 enchérisseurs maximum')
})

class ReverseAuctionService {

  /**
   * Créer une enchère inversée pour une annonce
   */
  async createReverseAuction(
    announcementId: string,
    config: Omit<ReverseAuctionConfig, 'announcementId'>
  ): Promise<{ auctionId: string; expiresAt: Date }> {
    try {
      const validatedConfig = auctionConfigSchema.parse(config)

      // Vérifier que l'annonce existe et n'a pas déjà une enchère
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: { reverseAuction: true }
      })

      if (!announcement) {
        throw new Error('Annonce introuvable')
      }

      if (announcement.reverseAuction) {
        throw new Error('Une enchère est déjà en cours pour cette annonce')
      }

      if (announcement.status !== 'ACTIVE') {
        throw new Error('L\'annonce doit être active pour créer une enchère')
      }

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + config.auctionDuration)

      // Créer l'enchère inversée
      const auction = await db.reverseAuction.create({
        data: {
          announcementId,
          initialPrice: config.initialPrice,
          minimumPrice: config.minimumPrice,
          currentBestPrice: config.initialPrice,
          auctionDuration: config.auctionDuration,
          autoAcceptThreshold: config.autoAcceptThreshold,
          maxBidders: config.maxBidders,
          expiresAt,
          status: 'ACTIVE',
          createdAt: new Date()
        }
      })

      // Mettre à jour l'annonce pour indiquer qu'elle est en enchère
      await db.announcement.update({
        where: { id: announcementId },
        data: { 
          isAuction: true,
          status: 'IN_AUCTION'
        }
      })

      // Notifier les livreurs matchés
      await this.notifyMatchedDeliverers(announcementId, auction.id)

      return {
        auctionId: auction.id,
        expiresAt
      }

    } catch (error) {
      console.error('Error creating reverse auction:', error)
      throw new Error('Erreur lors de la création de l\'enchère inversée')
    }
  }

  /**
   * Soumettre une enchère (livreur propose un prix)
   */
  async submitBid(bidData: BidSubmission): Promise<{ 
    bidId: string; 
    currentRank: number; 
    isWinning: boolean;
    autoAccepted?: boolean;
  }> {
    try {
      const validated = bidSubmissionSchema.parse(bidData)

      // Vérifier que l'enchère existe et est active
      const auction = await db.reverseAuction.findUnique({
        where: { announcementId: bidData.announcementId },
        include: {
          bids: true,
          announcement: {
            include: { author: true }
          }
        }
      })

      if (!auction) {
        throw new Error('Aucune enchère trouvée pour cette annonce')
      }

      if (auction.status !== 'ACTIVE' || auction.expiresAt < new Date()) {
        throw new Error('L\'enchère n\'est plus active')
      }

      if (bidData.proposedPrice < auction.minimumPrice) {
        throw new Error(`Le prix proposé doit être supérieur à ${auction.minimumPrice}€`)
      }

      if (bidData.proposedPrice >= auction.currentBestPrice) {
        throw new Error('Votre prix doit être inférieur au meilleur prix actuel')
      }

      // Vérifier que le livreur n'a pas déjà enchéri
      const existingBid = auction.bids.find(bid => bid.bidderId === bidData.bidderId)
      if (existingBid) {
        throw new Error('Vous avez déjà soumis une enchère pour cette annonce')
      }

      // Vérifier que le nombre maximum d'enchérisseurs n'est pas atteint
      if (auction.bids.length >= auction.maxBidders) {
        throw new Error('Nombre maximum d\'enchérisseurs atteint')
      }

      // Obtenir la note du livreur pour le score
      const delivererRating = await this.getDelivererRating(bidData.bidderId)

      // Créer l'enchère
      const bid = await db.auctionBid.create({
        data: {
          auctionId: auction.id,
          bidderId: bidData.bidderId,
          proposedPrice: bidData.proposedPrice,
          estimatedDeliveryTime: bidData.estimatedDeliveryTime || 60,
          additionalNotes: bidData.additionalNotes,
          validUntil: bidData.validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000),
          delivererRating,
          compositeScore: this.calculateCompositeScore(
            bidData.proposedPrice, 
            auction.initialPrice,
            delivererRating,
            bidData.estimatedDeliveryTime || 60
          ),
          createdAt: new Date()
        }
      })

      // Mettre à jour le meilleur prix de l'enchère
      await db.reverseAuction.update({
        where: { id: auction.id },
        data: {
          currentBestPrice: bidData.proposedPrice,
          totalBids: auction.totalBids + 1
        }
      })

      // Calculer le classement
      const allBids = await db.auctionBid.findMany({
        where: { auctionId: auction.id },
        orderBy: { compositeScore: 'desc' }
      })

      const currentRank = allBids.findIndex(b => b.id === bid.id) + 1
      const isWinning = currentRank === 1

      // Vérifier l'acceptation automatique
      let autoAccepted = false
      if (auction.autoAcceptThreshold && 
          bidData.proposedPrice <= auction.autoAcceptThreshold &&
          isWinning) {
        await this.acceptBid(bid.id, auction.announcement.authorId, true)
        autoAccepted = true
      }

      // Notifier les participants
      await this.notifyBidUpdate(auction.id, bid.id, isWinning)

      return {
        bidId: bid.id,
        currentRank,
        isWinning,
        autoAccepted
      }

    } catch (error) {
      console.error('Error submitting bid:', error)
      throw new Error('Erreur lors de la soumission de l\'enchère')
    }
  }

  /**
   * Accepter une enchère (client choisit le gagnant)
   */
  async acceptBid(
    bidId: string, 
    clientId: string, 
    isAutomatic: boolean = false
  ): Promise<AuctionResult> {
    try {
      const bid = await db.auctionBid.findUnique({
        where: { id: bidId },
        include: {
          auction: {
            include: {
              announcement: true,
              bids: {
                include: { bidder: { include: { profile: true } } }
              }
            }
          },
          bidder: { include: { profile: true } }
        }
      })

      if (!bid) {
        throw new Error('Enchère introuvable')
      }

      if (bid.auction.announcement.authorId !== clientId && !isAutomatic) {
        throw new Error('Seul le créateur de l\'annonce peut accepter une enchère')
      }

      if (bid.auction.status !== 'ACTIVE') {
        throw new Error('L\'enchère n\'est plus active')
      }

      const result = await db.$transaction(async (tx) => {
        // Marquer l'enchère comme gagnante
        await tx.auctionBid.update({
          where: { id: bidId },
          data: { 
            status: 'ACCEPTED',
            acceptedAt: new Date()
          }
        })

        // Mettre à jour l'enchère inversée
        await tx.reverseAuction.update({
          where: { id: bid.auctionId },
          data: {
            status: 'COMPLETED',
            winningBidId: bidId,
            completedAt: new Date()
          }
        })

        // Assigner le livreur à l'annonce
        await tx.announcement.update({
          where: { id: bid.auction.announcementId },
          data: {
            delivererId: bid.bidderId,
            finalPrice: bid.proposedPrice,
            status: 'ASSIGNED',
            isAuction: false
          }
        })

        // Marquer les autres enchères comme perdues
        await tx.auctionBid.updateMany({
          where: {
            auctionId: bid.auctionId,
            id: { not: bidId }
          },
          data: { status: 'LOST' }
        })

        return bid
      })

      // Calculer les statistiques
      const totalBids = bid.auction.bids.length
      const prices = bid.auction.bids.map(b => b.proposedPrice)
      const averagePrice = prices.reduce((sum, price) => sum + price, 0) / totalBids
      const savingsAmount = bid.auction.initialPrice - bid.proposedPrice
      const savingsPercentage = (savingsAmount / bid.auction.initialPrice) * 100

      // Notifier tous les participants
      await this.notifyAuctionResult(bid.auctionId, bidId)

      return {
        announcementId: bid.auction.announcementId,
        winningBid: {
          bidId: bid.id,
          bidderId: bid.bidderId,
          proposedPrice: bid.proposedPrice,
          estimatedDeliveryTime: bid.estimatedDeliveryTime,
          rating: bid.delivererRating
        },
        totalBids,
        averagePrice: Math.round(averagePrice * 100) / 100,
        savingsAmount: Math.round(savingsAmount * 100) / 100,
        savingsPercentage: Math.round(savingsPercentage * 100) / 100,
        auctionStatus: 'COMPLETED'
      }

    } catch (error) {
      console.error('Error accepting bid:', error)
      throw new Error('Erreur lors de l\'acceptation de l\'enchère')
    }
  }

  /**
   * Obtenir les résultats d'une enchère
   */
  async getAuctionResults(announcementId: string): Promise<AuctionResult> {
    try {
      const auction = await db.reverseAuction.findUnique({
        where: { announcementId },
        include: {
          bids: {
            include: { bidder: { include: { profile: true } } },
            orderBy: { compositeScore: 'desc' }
          },
          winningBid: {
            include: { bidder: { include: { profile: true } } }
          }
        }
      })

      if (!auction) {
        throw new Error('Aucune enchère trouvée pour cette annonce')
      }

      const totalBids = auction.bids.length
      const prices = auction.bids.map(b => b.proposedPrice)
      const averagePrice = totalBids > 0 ? 
        prices.reduce((sum, price) => sum + price, 0) / totalBids : 0

      const savingsAmount = auction.winningBid ? 
        auction.initialPrice - auction.winningBid.proposedPrice : 0
      const savingsPercentage = auction.winningBid ? 
        (savingsAmount / auction.initialPrice) * 100 : 0

      return {
        announcementId,
        winningBid: auction.winningBid ? {
          bidId: auction.winningBid.id,
          bidderId: auction.winningBid.bidderId,
          proposedPrice: auction.winningBid.proposedPrice,
          estimatedDeliveryTime: auction.winningBid.estimatedDeliveryTime,
          rating: auction.winningBid.delivererRating
        } : undefined,
        totalBids,
        averagePrice: Math.round(averagePrice * 100) / 100,
        savingsAmount: Math.round(savingsAmount * 100) / 100,
        savingsPercentage: Math.round(savingsPercentage * 100) / 100,
        auctionStatus: auction.status as any
      }

    } catch (error) {
      console.error('Error getting auction results:', error)
      throw new Error('Erreur lors de la récupération des résultats')
    }
  }

  /**
   * Annuler une enchère (uniquement par le client ou admin)
   */
  async cancelAuction(
    announcementId: string, 
    userId: string, 
    reason: string
  ): Promise<void> {
    try {
      const auction = await db.reverseAuction.findUnique({
        where: { announcementId },
        include: {
          announcement: true,
          bids: true
        }
      })

      if (!auction) {
        throw new Error('Aucune enchère trouvée')
      }

      // Vérifier les permissions
      const user = await db.user.findUnique({ where: { id: userId } })
      const canCancel = user?.role === 'ADMIN' || 
                       auction.announcement.authorId === userId

      if (!canCancel) {
        throw new Error('Permissions insuffisantes pour annuler cette enchère')
      }

      if (auction.status !== 'ACTIVE') {
        throw new Error('L\'enchère n\'est plus active')
      }

      await db.$transaction(async (tx) => {
        // Annuler l'enchère
        await tx.reverseAuction.update({
          where: { id: auction.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: reason
          }
        })

        // Marquer toutes les enchères comme annulées
        await tx.auctionBid.updateMany({
          where: { auctionId: auction.id },
          data: { status: 'CANCELLED' }
        })

        // Remettre l'annonce en état normal
        await tx.announcement.update({
          where: { id: announcementId },
          data: {
            isAuction: false,
            status: 'ACTIVE'
          }
        })
      })

      // Notifier tous les participants
      await this.notifyAuctionCancellation(auction.id, reason)

    } catch (error) {
      console.error('Error canceling auction:', error)
      throw new Error('Erreur lors de l\'annulation de l\'enchère')
    }
  }

  // Méthodes privées

  private calculateCompositeScore(
    proposedPrice: number,
    initialPrice: number,
    delivererRating: number,
    estimatedTime: number
  ): number {
    // Score composite : 50% prix, 30% rating, 20% temps
    const priceScore = ((initialPrice - proposedPrice) / initialPrice) * 100
    const ratingScore = (delivererRating / 5) * 100
    const timeScore = Math.max(0, 100 - ((estimatedTime - 30) / 30) * 10) // Bonus si < 1h

    return (priceScore * 0.5) + (ratingScore * 0.3) + (timeScore * 0.2)
  }

  private async getDelivererRating(delivererId: string): Promise<number> {
    const ratings = await db.review.findMany({
      where: { revieweeId: delivererId },
      select: { rating: true }
    })

    if (ratings.length === 0) return 3.0 // Note par défaut

    const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
    return Math.round(average * 10) / 10
  }

  private async notifyMatchedDeliverers(announcementId: string, auctionId: string): Promise<void> {
    // Implémenter notification OneSignal
    console.log(`Notifying matched deliverers for auction ${auctionId}`)
  }

  private async notifyBidUpdate(auctionId: string, bidId: string, isWinning: boolean): Promise<void> {
    // Implémenter notification de mise à jour
    console.log(`Bid update notification for auction ${auctionId}, bid ${bidId}, winning: ${isWinning}`)
  }

  private async notifyAuctionResult(auctionId: string, winningBidId: string): Promise<void> {
    // Implémenter notification résultat final
    console.log(`Auction result notification for auction ${auctionId}, winner: ${winningBidId}`)
  }

  private async notifyAuctionCancellation(auctionId: string, reason: string): Promise<void> {
    // Implémenter notification annulation
    console.log(`Auction cancellation notification for auction ${auctionId}, reason: ${reason}`)
  }
}

export const reverseAuctionService = new ReverseAuctionService()