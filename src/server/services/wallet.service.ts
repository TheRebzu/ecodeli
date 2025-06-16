// Service de gestion du portefeuille
import { db } from "@/server/db";

export const walletService = {
  getBalance: async (userId: string) => {
    // Récupérer le solde réel depuis la base de données
    const wallet = await db.wallet.findUnique({
      where: { userId },
      select: { balance: true, currency: true }});

    return wallet || { balance: 0, currency: "EUR" };
  },

  addFunds: async (userId: string, amount: number) => {
    // Ajouter des fonds réels au portefeuille
    const wallet = await db.wallet.upsert({
      where: { userId },
      create: {
        userId,
        balance: amount,
        currency: "EUR"},
      update: {
        balance: { increment }}});

    // Créer une transaction d'historique
    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: "CREDIT",
        description: "Ajout de fonds",
        status: "COMPLETED"}});

    return wallet;
  }};
