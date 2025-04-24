import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Génère un token de vérification pour un utilisateur
 * @param userId ID de l'utilisateur pour lequel générer le token
 * @returns Le token généré
 */
export async function generateVerificationToken(userId: string): Promise<string> {
  // Génération d'un token aléatoire
  const token = randomBytes(32).toString("hex");
  
  // Date d'expiration (24 heures)
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  
  // Suppression des tokens existants pour cet utilisateur
  await prisma.verificationToken.deleteMany({
    where: { userId }
  });
  
  // Création du nouveau token
  const verificationToken = await prisma.verificationToken.create({
    data: {
      token,
      expires,
      userId
    }
  });
  
  return verificationToken.token;
}

/**
 * Génère un token de réinitialisation de mot de passe
 * @param email Email de l'utilisateur
 * @returns Le token généré ou null si l'utilisateur n'existe pas
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  if (!user) {
    return null;
  }
  
  // Génération d'un token aléatoire
  const token = randomBytes(32).toString("hex");
  
  // Date d'expiration (1 heure)
  const expires = new Date();
  expires.setHours(expires.getHours() + 1);
  
  // Suppression des tokens existants pour cet utilisateur
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id }
  });
  
  // Création du nouveau token
  const resetToken = await prisma.passwordResetToken.create({
    data: {
      token,
      expires,
      userId: user.id
    }
  });
  
  return resetToken.token;
}

/**
 * Vérifie la validité d'un token de vérification
 * @param token Token à vérifier
 * @returns L'ID de l'utilisateur si le token est valide, null sinon
 */
export async function verifyVerificationToken(token: string): Promise<string | null> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token }
  });
  
  if (!verificationToken) {
    return null;
  }
  
  // Vérification de l'expiration
  if (verificationToken.expires < new Date()) {
    // Suppression du token expiré
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    });
    return null;
  }
  
  // Mise à jour de l'utilisateur
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: new Date() }
  });
  
  // Suppression du token utilisé
  await prisma.verificationToken.delete({
    where: { id: verificationToken.id }
  });
  
  return verificationToken.userId;
}

/**
 * Vérifie la validité d'un token de réinitialisation de mot de passe
 * @param token Token à vérifier
 * @returns L'ID de l'utilisateur si le token est valide, null sinon
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  });
  
  if (!resetToken) {
    return null;
  }
  
  // Vérification de l'expiration
  if (resetToken.expires < new Date()) {
    // Suppression du token expiré
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });
    return null;
  }
  
  return resetToken.userId;
}

/**
 * Consomme un token de réinitialisation de mot de passe
 * @param token Token à consommer
 * @returns true si le token a été consommé avec succès, false sinon
 */
export async function consumePasswordResetToken(token: string): Promise<boolean> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  });
  
  if (!resetToken) {
    return false;
  }
  
  // Suppression du token utilisé
  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id }
  });
  
  return true;
}
