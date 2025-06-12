// Service de gestion du portefeuille
import { db } from '@/server/db';

export const walletService = {
  getBalance: async (userId: string) => {
    // TODO: Implémenter la récupération du solde
    return { balance: 0, currency: 'EUR' };
  },

  addFunds: async (userId: string, amount: number) => {
    // TODO: Implémenter l'ajout de fonds
    console.log('Adding funds:', amount, 'to user:', userId);
  },
};
