import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé - rôle admin requis" },
        { status: 403 },
      );
    }

    // Récupérer les notifications système actives
    const alerts = await prisma.systemNotification.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error("Erreur récupération alertes:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

async function getSystemAlerts() {
  const alerts = [];

  try {
    // Vérifier les documents en attente depuis plus de 24h
    const pendingDocuments = await prisma.document.count({
      where: {
        status: "PENDING",
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Plus de 24h
        },
      },
    });

    if (pendingDocuments > 0) {
      alerts.push({
        id: "pending-docs",
        type: "warning",
        title: "Documents en attente",
        message: `${pendingDocuments} document(s) en attente de validation depuis plus de 24h`,
        timestamp: new Date().toISOString(),
        severity: "medium",
      });
    }

    // Vérifier les livraisons en cours depuis plus de 48h
    const stuckDeliveries = await prisma.delivery.count({
      where: {
        status: "IN_PROGRESS",
        updatedAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000), // Plus de 48h
        },
      },
    });

    if (stuckDeliveries > 0) {
      alerts.push({
        id: "stuck-deliveries",
        type: "warning",
        title: "Livraisons bloquées",
        message: `${stuckDeliveries} livraison(s) en cours depuis plus de 48h`,
        timestamp: new Date().toISOString(),
        severity: "high",
      });
    }

    // Vérifier les paiements échoués récents
    const failedPayments = await prisma.payment.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
      },
    });

    if (failedPayments > 5) {
      alerts.push({
        id: "failed-payments",
        type: "error",
        title: "Paiements échoués",
        message: `${failedPayments} paiement(s) échoué(s) dans les dernières 24h`,
        timestamp: new Date().toISOString(),
        severity: "high",
      });
    }

    // Vérifier les utilisateurs non validés depuis plus de 7 jours
    const unvalidatedUsers = await prisma.user.count({
      where: {
        role: {
          in: ["DELIVERER", "PROVIDER"],
        },
        validationStatus: "PENDING",
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Plus de 7 jours
        },
      },
    });

    if (unvalidatedUsers > 0) {
      alerts.push({
        id: "unvalidated-users",
        type: "info",
        title: "Utilisateurs en attente",
        message: `${unvalidatedUsers} utilisateur(s) en attente de validation depuis plus de 7 jours`,
        timestamp: new Date().toISOString(),
        severity: "low",
      });
    }

    // Vérifier les erreurs de base de données (approximatif)
    const recentErrors = await prisma.delivery.count({
      where: {
        status: "CANCELLED",
        updatedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Dernière heure
        },
      },
    });

    if (recentErrors > 10) {
      alerts.push({
        id: "high-cancellations",
        type: "warning",
        title: "Taux d'annulation élevé",
        message: `${recentErrors} livraison(s) annulée(s) dans la dernière heure`,
        timestamp: new Date().toISOString(),
        severity: "medium",
      });
    }

    // Vérifier les performances système (basé sur les métriques)
    const slowQueries = await prisma.delivery.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Dernière heure
        },
      },
    });

    if (slowQueries > 100) {
      alerts.push({
        id: "high-activity",
        type: "info",
        title: "Activité élevée",
        message: "Activité élevée détectée sur la plateforme",
        timestamp: new Date().toISOString(),
        severity: "low",
      });
    }

    return alerts;
  } catch (error) {
    console.error("Erreur génération alertes:", error);
    return [];
  }
}
