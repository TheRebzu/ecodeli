/**
 * Types pour la gestion des annonces client (version 2)
 */

export type AnnouncementStatusV2 = 
  | 'PENDING'    // En attente de publication
  | 'PUBLISHED'  // Annonce publiée et visible
  | 'ASSIGNED'   // Livreur assigné
  | 'IN_TRANSIT' // Colis en transit
  | 'DELIVERED'  // Colis livré
  | 'COMPLETED'  // Livraison confirmée et finalisée
  | 'CANCELLED'  // Annulée par le client
  | 'EXPIRED';   // Expirée (date dépassée)

export type AnnouncementTypeV2 = 
  | 'DELIVERY'        // Livraison standard
  | 'FOREIGN_PURCHASE' // Achat à l'étranger
  | 'SPECIAL_DELIVERY' // Livraison spéciale
  | 'SERVICE';        // Service (non livraison)

export type PackageSizeV2 = 
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'EXTRA_LARGE';

export type InsuranceOptionV2 = 
  | 'NONE'
  | 'BASIC'
  | 'PREMIUM';

export type BidStatusV2 =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED';

export type AnnouncementFilterV2 = {
  status?: AnnouncementStatusV2 | 'ALL';
  type?: AnnouncementTypeV2 | 'ALL';
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'pickupDate';
  sortDirection?: 'asc' | 'desc';
};

export type AnnouncementV2 = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string;
  status: AnnouncementStatusV2;
  type: AnnouncementTypeV2;
  price: number;
  expectedPrice?: number;
  
  // Information d'origine et destination
  pickupAddress: string;
  pickupAddressDetails?: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  
  deliveryAddress: string;
  deliveryAddressDetails?: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  
  // Données temporelles
  pickupDate: Date;
  pickupDateFlexible: boolean;
  deliveryDate?: Date;
  deliveryDateFlexible: boolean;
  expiresAt?: Date;
  
  // Informations sur le paquet
  packageSize: PackageSizeV2;
  packageWeight: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  packageImages?: string[];
  packageContents: string;
  packageValue?: number;
  
  // Expéditeur et destinataire
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  
  // Assurance
  insuranceOption: InsuranceOptionV2;
  insuranceCoverage?: number;
  
  // Options de livraison
  requiresSignature: boolean;
  fragileContent: boolean;
  specialInstructions?: string;
  
  // Utilisateur
  customerId: string;
  deliveryPersonId?: string;
  
  // Enchères
  bids?: BidV2[];
};

export type BidV2 = {
  id: string;
  announcementId: string;
  courierId: string;
  courierName: string;
  courierRating?: number;
  status: BidStatusV2;
  price: number;
  message?: string;
  estimatedDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAnnouncementInputV2 = Omit<
  AnnouncementV2, 
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'customerId' | 'deliveryPersonId' | 'bids'
>;

export type UpdateAnnouncementInputV2 = Partial<CreateAnnouncementInputV2> & {
  id: string;
}; 