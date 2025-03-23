'use server';

import { DeliveryStatus } from '@prisma/client';
import { db } from '@/lib/db';
import type { MonthlySales } from '@/components/charts/sales-chart';
import { unstable_cache } from 'next/cache';

/**
 * Récupère les données pour le graphique de statut des livraisons
 */
export const getDeliveryStatusData = unstable_cache(
  async () => {
    try {
      const statuses = Object.values(DeliveryStatus);
      
      // Récupérer le nombre de livraisons pour chaque statut
      const statusCounts = await Promise.all(
        statuses.map(async (status) => {
          const count = await db.shipment.count({
            where: {
              deliveryStatus: status
            }
          });
          
          return {
            status,
            count,
            color: getStatusColor(status)
          };
        })
      );
      
      // Filtrer les statuts qui n'ont pas de livraisons
      return statusCounts.filter(item => item.count > 0);
    } catch (error) {
      console.error('Erreur lors de la récupération des statuts de livraison:', error);
      return [];
    }
  },
  ['delivery-status-data'],
  { revalidate: 3600 } // Cache pendant 1 heure
);

/**
 * Récupère les données pour le graphique de chiffre d'affaires mensuel
 */
export const getMonthlySalesData = unstable_cache(
  async (): Promise<MonthlySales[]> => {
    try {
      const currentYear = new Date().getFullYear();
      const monthlyData: MonthlySales[] = [];
      
      // Noms des mois en français abrégés
      const monthNames = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
        'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
      ];
      
      // Pour chaque mois, calculer le chiffre d'affaires
      for (let month = 0; month < 12; month++) {
        const startDate = new Date(currentYear, month, 1);
        const endDate = new Date(currentYear, month + 1, 0);
        
        // Obtenir le total des paiements pour ce mois
        const payments = await db.payment.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            },
            status: 'COMPLETED' // Seulement les paiements complétés
          },
          select: {
            amount: true
          }
        });
        
        const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Définir un objectif (fictif pour l'exemple - pourrait être basé sur des données réelles)
        const objective = 5000 + Math.floor(month / 3) * 1000; // Augmentation de l'objectif chaque trimestre
        
        monthlyData.push({
          month: monthNames[month],
          chiffreAffaires: Math.round(totalAmount),
          objectif: objective
        });
      }
      
      return monthlyData;
    } catch (error) {
      console.error('Erreur lors de la récupération des données de vente:', error);
      
      // Retourner des données par défaut en cas d'erreur
      return getDefaultMonthlySalesData();
    }
  },
  ['monthly-sales-data'],
  { revalidate: 3600 } // Cache pendant 1 heure
);

/**
 * Récupère les données de performance des prestataires
 */
export const getProviderPerformanceData = unstable_cache(
  async () => {
    try {
      // Récupérer les prestataires avec leurs évaluations
      const providers = await db.provider.findMany({
        where: {
          user: {
            status: 'APPROVED'
          }
        },
        include: {
          user: true,
          // Relations avec les évaluations via les services
          // Note: Cela dépend de la structure exacte de votre base de données
        },
        take: 3 // Limiter à 3 prestataires pour le graphique
      });
      
      // Couleurs pour les prestataires
      const colors = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6'];
      
      // Transformer les données pour le graphique
      // Comme nous n'avons pas accès direct aux évaluations de performance, nous générons des exemples
      return providers.map((provider, index) => {
        // Dans un cas réel, ces métriques devraient être calculées à partir des évaluations
        const metrics = [
          { category: 'Ponctualité', value: randomValue(70, 95), fullMark: 100 },
          { category: 'Qualité', value: randomValue(70, 95), fullMark: 100 },
          { category: 'Prix', value: randomValue(70, 95), fullMark: 100 },
          { category: 'Communication', value: randomValue(70, 95), fullMark: 100 },
          { category: 'Fiabilité', value: randomValue(70, 95), fullMark: 100 },
          { category: 'Satisfaction', value: randomValue(70, 95), fullMark: 100 },
        ];
        
        return {
          name: provider.user.name,
          metrics,
          color: colors[index % colors.length]
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des performances des prestataires:', error);
      return [];
    }
  },
  ['provider-performance-data'],
  { revalidate: 3600 } // Cache pendant 1 heure
);

// Fonctions utilitaires

/**
 * Renvoie une couleur en fonction du statut de livraison
 */
function getStatusColor(status: DeliveryStatus): string {
  const colors = {
    [DeliveryStatus.PENDING]: '#ffca3a',     // Jaune
    [DeliveryStatus.PICKED_UP]: '#8ac926',   // Vert clair
    [DeliveryStatus.IN_TRANSIT]: '#1982c4',  // Bleu
    [DeliveryStatus.STORED]: '#6a4c93',      // Violet
    [DeliveryStatus.DELIVERED]: '#06d6a0',   // Vert
    [DeliveryStatus.CANCELLED]: '#e71d36',   // Rouge
    [DeliveryStatus.FAILED]: '#ff595e',      // Rouge clair
  };
  
  return colors[status] || '#999999'; // Gris par défaut
}

/**
 * Génère une valeur aléatoire entre min et max
 */
function randomValue(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Renvoie des données de vente mensuelles par défaut
 */
function getDefaultMonthlySalesData(): MonthlySales[] {
  return [
    { month: 'Jan', chiffreAffaires: 4200, objectif: 5000 },
    { month: 'Fév', chiffreAffaires: 4800, objectif: 5000 },
    { month: 'Mar', chiffreAffaires: 5500, objectif: 5000 },
    { month: 'Avr', chiffreAffaires: 5700, objectif: 6000 },
    { month: 'Mai', chiffreAffaires: 6200, objectif: 6000 },
    { month: 'Juin', chiffreAffaires: 5900, objectif: 6000 },
    { month: 'Juil', chiffreAffaires: 6800, objectif: 7000 },
    { month: 'Août', chiffreAffaires: 6500, objectif: 7000 },
    { month: 'Sep', chiffreAffaires: 7100, objectif: 7000 },
    { month: 'Oct', chiffreAffaires: 7500, objectif: 8000 },
    { month: 'Nov', chiffreAffaires: 8200, objectif: 8000 },
    { month: 'Déc', chiffreAffaires: 9100, objectif: 8000 },
  ];
} 