import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function checkProfileCompleteness(userId: string, userRole: UserRole) {
  const requiredDocuments = getRequiredDocuments(userRole);
  
  // Si aucun document requis, le profil est complet
  if (requiredDocuments.length === 0) {
    return { isComplete: true, missingDocuments: [] };
  }

  try {
    const userDocuments = await db.document.findMany({
      where: { userId },
      select: { type: true },
    });

    const uploadedTypes = userDocuments.map(doc => doc.type);
    const missingDocuments = requiredDocuments.filter(type => !uploadedTypes.includes(type));

    return {
      isComplete: missingDocuments.length === 0,
      missingDocuments,
    };
  } catch (error) {
    console.error("Erreur vérification profil:", error);
    return { isComplete: false, missingDocuments: requiredDocuments };
  }
}

export function getRequiredDocuments(role: UserRole): string[] {
  const requirements: Record<UserRole, string[]> = {
    CLIENT: [],
    ADMIN: [],
    DELIVERER: ["IDENTITY", "INSURANCE"],
    PROVIDER: ["IDENTITY", "CERTIFICATION", "INSURANCE"],
    MERCHANT: ["IDENTITY", "CERTIFICATION", "INSURANCE"],
  };
  return requirements[role] || [];
}

export function shouldRedirectToProfileCompletion(userRole: UserRole): boolean {
  return ["DELIVERER", "PROVIDER", "MERCHANT"].includes(userRole);
}

export async function getUserProfileStatus(userId: string, userRole: UserRole) {
  if (!shouldRedirectToProfileCompletion(userRole)) {
    return { needsCompletion: false, isComplete: true };
  }

  const { isComplete } = await checkProfileCompleteness(userId, userRole);
  
  return {
    needsCompletion: !isComplete,
    isComplete,
  };
}