import { prisma } from '@/lib/prisma';

export class OneSignalService {
  // Méthodes du service
  
  static async getData() {
    try {
      // Logique du service
      return { success: true };
    } catch (error) {
      console.error('Error in ServiceName.getData:', error);
      return { success: false, error };
    }
  }
}

