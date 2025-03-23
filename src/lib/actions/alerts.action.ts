"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { 
  createAlertRuleSchema, 
  AlertRule, 
  Alert, 
  AlertMetricTypeEnum,
  AlertSeverityEnum
} from "@/lib/schema/alert.schema";
import { getCurrentUser } from "@/lib/session-helper";

/**
 * Récupération des règles d'alerte pour l'utilisateur courant
 */
export async function getAlertRules(): Promise<AlertRule[]> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    const rules = await prisma.alertRule.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return rules;
  } catch (error) {
    console.error("Erreur lors de la récupération des règles d'alerte:", error);
    return [];
  }
}

/**
 * Création d'une nouvelle règle d'alerte
 */
export async function createAlertRule(
  data: z.infer<typeof createAlertRuleSchema>
): Promise<AlertRule | null> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    // Validation des données
    const validData = createAlertRuleSchema.parse(data);

    // Création de la règle
    const rule = await prisma.alertRule.create({
      data: {
        ...validData,
        userId: user.id,
      },
    });

    revalidatePath("/admin/alerts");
    return rule;
  } catch (error) {
    console.error("Erreur lors de la création de la règle d'alerte:", error);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation échouée: ${error.errors.map(e => e.message).join(", ")}`);
    }
    throw new Error("Échec de la création de la règle d'alerte");
  }
}

/**
 * Mise à jour d'une règle d'alerte existante
 */
export async function updateAlertRule(
  id: string,
  data: Partial<z.infer<typeof createAlertRuleSchema>>
): Promise<AlertRule | null> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    // Vérification que la règle existe et appartient à l'utilisateur
    const existingRule = await prisma.alertRule.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingRule) {
      throw new Error("Règle d'alerte introuvable ou accès non autorisé");
    }

    // Mise à jour de la règle
    const updatedRule = await prisma.alertRule.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/alerts");
    return updatedRule;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la règle d'alerte:", error);
    throw new Error("Échec de la mise à jour de la règle d'alerte");
  }
}

/**
 * Suppression d'une règle d'alerte
 */
export async function deleteAlertRule(id: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    // Vérification que la règle existe et appartient à l'utilisateur
    const existingRule = await prisma.alertRule.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingRule) {
      throw new Error("Règle d'alerte introuvable ou accès non autorisé");
    }

    // Suppression des alertes liées à cette règle
    await prisma.alert.deleteMany({
      where: {
        ruleId: id,
      },
    });

    // Suppression de la règle
    await prisma.alertRule.delete({
      where: { id },
    });

    revalidatePath("/admin/alerts");
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la règle d'alerte:", error);
    throw new Error("Échec de la suppression de la règle d'alerte");
  }
}

/**
 * Récupération des alertes pour l'utilisateur courant
 */
export async function getAlerts(options: { 
  severity?: string; 
  page?: number; 
  limit?: number;
  includeRead?: boolean;
  includeDismissed?: boolean;
}): Promise<{ 
  alerts: Alert[]; 
  totalCount: number;
  totalPages: number;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    const { 
      severity, 
      page = 1, 
      limit = 10,
      includeRead = false,
      includeDismissed = false
    } = options;

    // Préparation des filtres
    const where: any = {
      userId: user.id,
    };

    if (severity && severity !== "ALL") {
      where.severity = severity;
    }

    if (!includeRead) {
      where.read = false;
    }

    if (!includeDismissed) {
      where.dismissed = false;
    }

    // Récupération du nombre total d'alertes
    const totalCount = await prisma.alert.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Récupération des alertes paginées
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        rule: {
          select: {
            name: true,
            metricType: true,
            condition: true,
            threshold: true,
          },
        },
      },
    });

    return {
      alerts,
      totalCount,
      totalPages,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des alertes:", error);
    return {
      alerts: [],
      totalCount: 0,
      totalPages: 0,
    };
  }
}

/**
 * Marquer une alerte comme lue
 */
export async function markAlertAsRead(id: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    // Vérification que l'alerte existe et appartient à l'utilisateur
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingAlert) {
      throw new Error("Alerte introuvable ou accès non autorisé");
    }

    // Mise à jour de l'alerte
    await prisma.alert.update({
      where: { id },
      data: { read: true },
    });

    revalidatePath("/admin/alerts");
    return true;
  } catch (error) {
    console.error("Erreur lors du marquage de l'alerte comme lue:", error);
    return false;
  }
}

/**
 * Marquer une alerte comme ignorée
 */
export async function dismissAlert(id: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    // Vérification que l'alerte existe et appartient à l'utilisateur
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingAlert) {
      throw new Error("Alerte introuvable ou accès non autorisé");
    }

    // Mise à jour de l'alerte
    await prisma.alert.update({
      where: { id },
      data: { dismissed: true },
    });

    revalidatePath("/admin/alerts");
    return true;
  } catch (error) {
    console.error("Erreur lors de l'ignorance de l'alerte:", error);
    return false;
  }
}

/**
 * Marquer toutes les alertes comme lues
 */
export async function markAllAlertsAsRead(severity?: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      throw new Error("Utilisateur non authentifié");
    }

    const where: any = {
      userId: user.id,
      read: false,
    };

    if (severity && severity !== "ALL") {
      where.severity = severity;
    }

    // Mise à jour des alertes
    await prisma.alert.updateMany({
      where,
      data: { read: true },
    });

    revalidatePath("/admin/alerts");
    return true;
  } catch (error) {
    console.error("Erreur lors du marquage des alertes comme lues:", error);
    return false;
  }
}

/**
 * Création d'une alerte (pour le système de monitoring)
 */
export async function createAlert(data: {
  ruleId: string;
  metricType: string;
  message: string;
  details?: string;
  value: number;
  expectedValue?: number;
  deviation?: number;
  severity: string;
}): Promise<Alert | null> {
  try {
    // Validation basique des données
    if (!data.ruleId || !data.metricType || !data.message || data.value === undefined || !data.severity) {
      throw new Error("Données d'alerte incomplètes");
    }

    // Récupération de la règle pour obtenir l'utilisateur
    const rule = await prisma.alertRule.findUnique({
      where: { id: data.ruleId },
    });

    if (!rule || !rule.userId) {
      throw new Error("Règle d'alerte introuvable");
    }

    // Création de l'alerte
    const alert = await prisma.alert.create({
      data: {
        ruleId: data.ruleId,
        userId: rule.userId,
        metricType: data.metricType as any,
        message: data.message,
        details: data.details,
        value: data.value,
        expectedValue: data.expectedValue,
        deviation: data.deviation,
        severity: data.severity as any,
        read: false,
        dismissed: false,
      },
    });

    return alert;
  } catch (error) {
    console.error("Erreur lors de la création de l'alerte:", error);
    return null;
  }
} 