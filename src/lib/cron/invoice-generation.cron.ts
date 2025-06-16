import { invoiceGenerationService } from "@/server/services/billing/invoice-generation.service";

/**
 * Tâche cron pour la génération automatique des factures
 * À exécuter le 1er de chaque mois à 02:00
 */
export async function generateMonthlyInvoicesCron() {
  console.log("Démarrage de la génération automatique des factures mensuelles...");
  
  try {
    await invoiceGenerationService.scheduleMonthlyInvoiceGeneration();
    console.log("Génération automatique des factures terminée avec succès");
  } catch (error) {
    console.error("Erreur lors de la génération automatique des factures:", error);
    throw error;
  }
}

/**
 * Configuration du cron job
 * Cron expression: "0 2 1 * *" = Tous les 1er du mois à 02:00
 */
export const INVOICE_GENERATION_CRON_CONFIG = {
  schedule: "0 2 1 * *",
  timezone: "Europe/Paris",
  description: "Génération automatique des factures mensuelles pour les prestataires"
};

// Export pour utilisation avec un gestionnaire de tâches comme node-cron ou bull
const defaultExport = {
  handler: generateMonthlyInvoicesCron,
  config: INVOICE_GENERATION_CRON_CONFIG
};
export default defaultExport;