/**
 * Service mock pour gérer les offres (bids) sans dépendre de Prisma
 */

interface Bid {
  id: string;
  userId: string;
  announcementId: string;
  amount: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

interface ServiceResult {
  success: boolean;
  error?: string;
  data?: Bid | Bid[];
}

interface BidUpdateData {
  id: string;
  amount?: number;
  message?: string;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  [key: string]: any; // Pour les autres propriétés optionnelles
}

interface BidCreateData {
  amount: number;
  message: string;
}

// Données mock pour simuler des offres
const mockBids: Bid[] = [
  {
    id: '1',
    userId: 'user1',
    announcementId: 'announcement1',
    amount: 100,
    message: 'Je peux livrer rapidement',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    userId: 'user2',
    announcementId: 'announcement1',
    amount: 120,
    message: 'Livraison avec véhicule frigorifique',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export class BidService {
  /**
   * Récupère toutes les offres pour une annonce donnée
   */
  static async getBidsForAnnouncement(userId: string, announcementId: string): Promise<ServiceResult> {
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const bids = mockBids.filter(bid => bid.announcementId === announcementId);
      
      return {
        success: true,
        data: bids
      };
    } catch (error) {
      console.error('Error fetching bids:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  /**
   * Met à jour une offre
   */
  static async updateBid(userId: string, bidData: BidUpdateData): Promise<ServiceResult> {
    try {
      const bidIndex = mockBids.findIndex(bid => bid.id === bidData.id);
      
      if (bidIndex === -1) {
        return {
          success: false,
          error: 'Offre non trouvée'
        };
      }

      // Vérifier si l'utilisateur est autorisé à modifier cette offre
      if (mockBids[bidIndex].userId !== userId) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à modifier cette offre'
        };
      }

      // Mettre à jour l'offre
      mockBids[bidIndex] = {
        ...mockBids[bidIndex],
        ...bidData,
        updatedAt: new Date()
      };

      return {
        success: true,
        data: mockBids[bidIndex]
      };
    } catch (error) {
      console.error('Error updating bid:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  /**
   * Accepte une offre
   */
  static async acceptBid(userId: string, bidId: string): Promise<ServiceResult> {
    try {
      const bidIndex = mockBids.findIndex(bid => bid.id === bidId);
      
      if (bidIndex === -1) {
        return {
          success: false,
          error: 'Offre non trouvée'
        };
      }

      // Dans un cas réel, nous vérifierions si l'utilisateur est le propriétaire de l'annonce
      // Pour le mock, on accepte simplement
      
      // Accepter l'offre sélectionnée
      mockBids[bidIndex].status = 'ACCEPTED';
      mockBids[bidIndex].updatedAt = new Date();
      
      // Rejeter toutes les autres offres pour cette annonce
      const announcementId = mockBids[bidIndex].announcementId;
      mockBids.forEach((bid, index) => {
        if (bid.announcementId === announcementId && bid.id !== bidId && bid.status === 'PENDING') {
          mockBids[index].status = 'REJECTED';
          mockBids[index].updatedAt = new Date();
        }
      });

      return {
        success: true,
        data: mockBids[bidIndex]
      };
    } catch (error) {
      console.error('Error accepting bid:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  /**
   * Rejette une offre
   */
  static async rejectBid(userId: string, bidId: string): Promise<ServiceResult> {
    try {
      const bidIndex = mockBids.findIndex(bid => bid.id === bidId);
      
      if (bidIndex === -1) {
        return {
          success: false,
          error: 'Offre non trouvée'
        };
      }

      // Dans un cas réel, nous vérifierions si l'utilisateur est le propriétaire de l'annonce
      // Pour le mock, on rejette simplement
      
      // Rejeter l'offre
      mockBids[bidIndex].status = 'REJECTED';
      mockBids[bidIndex].updatedAt = new Date();

      return {
        success: true,
        data: mockBids[bidIndex]
      };
    } catch (error) {
      console.error('Error rejecting bid:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  /**
   * Crée une nouvelle offre
   */
  static async createBid(userId: string, announcementId: string, bidData: BidCreateData): Promise<ServiceResult> {
    try {
      // Vérifier si l'utilisateur a déjà fait une offre sur cette annonce
      const existingBid = mockBids.find(
        bid => bid.userId === userId && 
        bid.announcementId === announcementId &&
        ['PENDING', 'ACCEPTED'].includes(bid.status)
      );
      
      if (existingBid) {
        return {
          success: false,
          error: 'Vous avez déjà fait une offre sur cette annonce'
        };
      }

      // Créer une nouvelle offre
      const newBid: Bid = {
        id: `bid_${Date.now()}`,
        userId,
        announcementId,
        amount: bidData.amount,
        message: bidData.message,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Ajouter à notre collection mock
      mockBids.push(newBid);

      return {
        success: true,
        data: newBid
      };
    } catch (error) {
      console.error('Error creating bid:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }
} 