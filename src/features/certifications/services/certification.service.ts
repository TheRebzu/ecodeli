import { prisma } from "@/lib/db";
import { NotificationService } from "@/features/notifications/services/notification.service";
import { generatePDF } from "@/lib/utils/pdf";
import { z } from "zod";

export interface CertificationEnrollment {
  entityType: "provider" | "deliverer";
  entityId: string;
  certificationId: string;
}

export interface ExamSubmission {
  answers: Record<string, any>;
  timeSpent: number;
}

export interface CertificationStats {
  totalCertifications: number;
  activeCertifications: number;
  completedCount: number;
  inProgressCount: number;
  averageScore: number;
  expiringCount: number;
}

export interface CertificationModule {
  id: string;
  title: string;
  description: string;
  content: string;
  orderIndex: number;
  estimatedDuration: number;
  isRequired: boolean;
  resources: any[];
  progress?: ModuleProgress;
}

export interface ModuleProgress {
  id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  startedAt?: Date;
  completedAt?: Date;
  timeSpent: number;
  score?: number;
  attempts: number;
}

export interface CertificationDetails {
  id: string;
  name: string;
  description: string;
  category: string;
  level: string;
  isRequired: boolean;
  validityDuration?: number;
  price?: number;
  passScore: number;
  maxAttempts: number;
  modules: CertificationModule[];
  userProgress?: {
    status: string;
    enrolledAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    score?: number;
    attempts: number;
    certificateUrl?: string;
    isValid: boolean;
    expiresAt?: Date;
  };
}

export interface ExamQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "true_false" | "text";
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  points: number;
}

export interface ExamSession {
  id: string;
  certificationId: string;
  sessionNumber: number;
  timeLimit: number;
  questions: ExamQuestion[];
  startedAt: Date;
  timeRemaining?: number;
}

export interface ExamResult {
  sessionId: string;
  score: number;
  isPassed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  feedback: string;
  certificateUrl?: string;
}

export class CertificationService {
  /**
   * Récupère toutes les certifications disponibles
   */
  static async getAllCertifications(
    filters: {
      category?: string;
      level?: string;
      isRequired?: boolean;
      search?: string;
    } = {},
  ) {
    try {
      const where: any = {
        isActive: true,
      };

      if (filters.category) {
        where.category = filters.category;
      }

      if (filters.level) {
        where.level = filters.level;
      }

      if (filters.isRequired !== undefined) {
        where.isRequired = filters.isRequired;
      }

      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const certifications = await prisma.certification.findMany({
        where,
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
          },
          _count: {
            select: {
              providerCertifications: true,
              delivererCertifications: true,
            },
          },
        },
        orderBy: [{ isRequired: "desc" }, { category: "asc" }, { name: "asc" }],
      });

      return certifications;
    } catch (error) {
      console.error("Erreur récupération certifications:", error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'une certification avec le progrès utilisateur
   */
  static async getCertificationDetails(
    certificationId: string,
    userId: string,
    userType: "provider" | "deliverer",
  ): Promise<CertificationDetails> {
    try {
      const certification = await prisma.certification.findUnique({
        where: { id: certificationId },
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (!certification) {
        throw new Error("Certification non trouvée");
      }

      // Récupérer le progrès utilisateur
      let userProgress = null;
      let moduleProgresses: any[] = [];

      if (userType === "provider") {
        const provider = await prisma.provider.findUnique({
          where: { userId },
        });

        if (provider) {
          userProgress = await prisma.providerCertification.findUnique({
            where: {
              providerId_certificationId: {
                providerId: provider.id,
                certificationId,
              },
            },
          });

          if (userProgress) {
            moduleProgresses = await prisma.moduleProgress.findMany({
              where: {
                providerCertificationId: userProgress.id,
              },
            });
          }
        }
      } else {
        const deliverer = await prisma.deliverer.findUnique({
          where: { userId },
        });

        if (deliverer) {
          userProgress = await prisma.delivererCertification.findUnique({
            where: {
              delivererId_certificationId: {
                delivererId: deliverer.id,
                certificationId,
              },
            },
          });

          if (userProgress) {
            moduleProgresses = await prisma.moduleProgress.findMany({
              where: {
                delivererCertificationId: userProgress.id,
              },
            });
          }
        }
      }

      // Mapper les modules avec leur progrès
      const modulesWithProgress = certification.modules.map((module) => {
        const progress = moduleProgresses.find((p) => p.moduleId === module.id);

        return {
          ...module,
          progress: progress
            ? {
                id: progress.id,
                status: progress.status,
                startedAt: progress.startedAt,
                completedAt: progress.completedAt,
                timeSpent: progress.timeSpent,
                score: progress.score,
                attempts: progress.attempts,
              }
            : undefined,
        };
      });

      return {
        id: certification.id,
        name: certification.name,
        description: certification.description,
        category: certification.category,
        level: certification.level,
        isRequired: certification.isRequired,
        validityDuration: certification.validityDuration,
        price: certification.price,
        passScore: certification.passScore,
        maxAttempts: certification.maxAttempts,
        modules: modulesWithProgress,
        userProgress: userProgress
          ? {
              status: userProgress.status,
              enrolledAt: userProgress.enrolledAt,
              startedAt: userProgress.startedAt,
              completedAt: userProgress.completedAt,
              score: userProgress.score,
              attempts: userProgress.attempts,
              certificateUrl: userProgress.certificateUrl,
              isValid: userProgress.isValid,
              expiresAt: userProgress.expiresAt,
            }
          : undefined,
      };
    } catch (error) {
      console.error("Erreur récupération détails certification:", error);
      throw error;
    }
  }

  /**
   * Inscrit un utilisateur à une certification
   */
  static async enrollInCertification(
    certificationId: string,
    userId: string,
    userType: "provider" | "deliverer",
  ) {
    try {
      if (userType === "provider") {
        const provider = await prisma.provider.findUnique({
          where: { userId },
        });

        if (!provider) {
          throw new Error("Profil prestataire non trouvé");
        }

        // Vérifier si déjà inscrit
        const existing = await prisma.providerCertification.findUnique({
          where: {
            providerId_certificationId: {
              providerId: provider.id,
              certificationId,
            },
          },
        });

        if (existing) {
          throw new Error("Déjà inscrit à cette certification");
        }

        // Créer l'inscription
        const enrollment = await prisma.providerCertification.create({
          data: {
            providerId: provider.id,
            certificationId,
            status: "ENROLLED",
          },
        });

        return enrollment;
      } else {
        const deliverer = await prisma.deliverer.findUnique({
          where: { userId },
        });

        if (!deliverer) {
          throw new Error("Profil livreur non trouvé");
        }

        const existing = await prisma.delivererCertification.findUnique({
          where: {
            delivererId_certificationId: {
              delivererId: deliverer.id,
              certificationId,
            },
          },
        });

        if (existing) {
          throw new Error("Déjà inscrit à cette certification");
        }

        const enrollment = await prisma.delivererCertification.create({
          data: {
            delivererId: deliverer.id,
            certificationId,
            status: "ENROLLED",
          },
        });

        return enrollment;
      }
    } catch (error) {
      console.error("Erreur inscription certification:", error);
      throw error;
    }
  }

  /**
   * Démarre un module de certification
   */
  static async startModule(
    certificationId: string,
    moduleId: string,
    userId: string,
    userType: "provider" | "deliverer",
  ) {
    try {
      // Récupérer l'inscription utilisateur
      let userCertification: any = null;

      if (userType === "provider") {
        const provider = await prisma.provider.findUnique({
          where: { userId },
        });

        if (!provider) {
          throw new Error("Profil prestataire non trouvé");
        }

        userCertification = await prisma.providerCertification.findUnique({
          where: {
            providerId_certificationId: {
              providerId: provider.id,
              certificationId,
            },
          },
        });
      } else {
        const deliverer = await prisma.deliverer.findUnique({
          where: { userId },
        });

        if (!deliverer) {
          throw new Error("Profil livreur non trouvé");
        }

        userCertification = await prisma.delivererCertification.findUnique({
          where: {
            delivererId_certificationId: {
              delivererId: deliverer.id,
              certificationId,
            },
          },
        });
      }

      if (!userCertification) {
        throw new Error("Inscription à la certification non trouvée");
      }

      // Vérifier si le module existe déjà en progrès
      const existingProgress = await prisma.moduleProgress.findFirst({
        where: {
          moduleId,
          [userType === "provider"
            ? "providerCertificationId"
            : "delivererCertificationId"]: userCertification.id,
        },
      });

      if (existingProgress) {
        // Mettre à jour le statut si pas encore commencé
        if (existingProgress.status === "NOT_STARTED") {
          const updated = await prisma.moduleProgress.update({
            where: { id: existingProgress.id },
            data: {
              status: "IN_PROGRESS",
              startedAt: new Date(),
            },
          });
          return updated;
        }
        return existingProgress;
      }

      // Créer le progrès du module
      const moduleProgress = await prisma.moduleProgress.create({
        data: {
          moduleId,
          [userType === "provider"
            ? "providerCertificationId"
            : "delivererCertificationId"]: userCertification.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      // Mettre à jour le statut de la certification si c'est le premier module
      if (userCertification.status === "ENROLLED") {
        if (userType === "provider") {
          await prisma.providerCertification.update({
            where: { id: userCertification.id },
            data: {
              status: "IN_PROGRESS",
              startedAt: new Date(),
            },
          });
        } else {
          await prisma.delivererCertification.update({
            where: { id: userCertification.id },
            data: {
              status: "IN_PROGRESS",
              startedAt: new Date(),
            },
          });
        }
      }

      return moduleProgress;
    } catch (error) {
      console.error("Erreur démarrage module:", error);
      throw error;
    }
  }

  /**
   * Complète un module de certification
   */
  static async completeModule(
    certificationId: string,
    moduleId: string,
    userId: string,
    userType: "provider" | "deliverer",
    score: number,
    timeSpent: number,
  ) {
    try {
      // Récupérer l'inscription et le progrès
      let userCertification: any = null;
      let certificationTable =
        userType === "provider"
          ? "providerCertification"
          : "delivererCertification";

      if (userType === "provider") {
        const provider = await prisma.provider.findUnique({
          where: { userId },
        });

        userCertification = await prisma.providerCertification.findUnique({
          where: {
            providerId_certificationId: {
              providerId: provider!.id,
              certificationId,
            },
          },
        });
      } else {
        const deliverer = await prisma.deliverer.findUnique({
          where: { userId },
        });

        userCertification = await prisma.delivererCertification.findUnique({
          where: {
            delivererId_certificationId: {
              delivererId: deliverer!.id,
              certificationId,
            },
          },
        });
      }

      // Mettre à jour le progrès du module
      const moduleProgress = await prisma.moduleProgress.updateMany({
        where: {
          moduleId,
          [userType === "provider"
            ? "providerCertificationId"
            : "delivererCertificationId"]: userCertification.id,
        },
        data: {
          status: score >= 70 ? "COMPLETED" : "FAILED", // 70% minimum pour réussir un module
          completedAt: new Date(),
          score,
          timeSpent: { increment: timeSpent },
          attempts: { increment: 1 },
        },
      });

      // Vérifier si tous les modules sont terminés
      const allModules = await prisma.certificationModule.findMany({
        where: { certificationId },
        select: { id: true, isRequired: true },
      });

      const allProgress = await prisma.moduleProgress.findMany({
        where: {
          [userType === "provider"
            ? "providerCertificationId"
            : "delivererCertificationId"]: userCertification.id,
        },
      });

      // Calculer si la certification est complète
      const requiredModules = allModules.filter((m) => m.isRequired);
      const completedRequiredModules = allProgress.filter(
        (p) =>
          requiredModules.some((m) => m.id === p.moduleId) &&
          p.status === "COMPLETED",
      );

      const isComplete =
        completedRequiredModules.length === requiredModules.length;

      if (isComplete) {
        // Calculer le score moyen
        const completedModules = allProgress.filter(
          (p) => p.status === "COMPLETED",
        );
        const averageScore =
          completedModules.reduce((sum, p) => sum + (p.score || 0), 0) /
          completedModules.length;

        // Récupérer le score minimum requis
        const certification = await prisma.certification.findUnique({
          where: { id: certificationId },
          select: { passScore: true },
        });

        const isPassed = averageScore >= (certification?.passScore || 80);

        // Mettre à jour la certification
        const updateData = {
          status: isPassed ? "COMPLETED" : "FAILED",
          completedAt: new Date(),
          score: averageScore,
          isValid: isPassed,
        };

        if (isPassed) {
          // Générer le certificat et calculer l'expiration
          const certificateUrl = await this.generateCertificate(
            userCertification.id,
            userType,
          );
          const expiresAt = await this.calculateExpirationDate(certificationId);

          Object.assign(updateData, {
            certificateUrl,
            expiresAt,
          });
        }

        if (userType === "provider") {
          await prisma.providerCertification.update({
            where: { id: userCertification.id },
            data: updateData,
          });
        } else {
          await prisma.delivererCertification.update({
            where: { id: userCertification.id },
            data: updateData,
          });
        }
      }

      return {
        moduleCompleted: true,
        certificationCompleted: isComplete,
        score,
        moduleProgress,
      };
    } catch (error) {
      console.error("Erreur complétion module:", error);
      throw error;
    }
  }

  /**
   * Génère les questions d'examen pour une certification
   */
  static async generateExamQuestions(
    certificationId: string,
  ): Promise<ExamQuestion[]> {
    // Dans une vraie application, récupérer depuis une base de questions
    // Pour l'instant, on simule
    const sampleQuestions: ExamQuestion[] = [
      {
        id: "1",
        question: "Quelle est la priorité principale d'EcoDeli ?",
        type: "multiple_choice",
        options: [
          "Maximiser les profits",
          "Réduire l'impact environnemental",
          "Concurrencer les autres plateformes",
          "Augmenter la vitesse de livraison",
        ],
        correctAnswer: 1,
        explanation:
          "EcoDeli vise avant tout à réduire l'impact environnemental du transport.",
        points: 10,
      },
      {
        id: "2",
        question:
          "Un prestataire doit-il toujours respecter les horaires convenus ?",
        type: "true_false",
        options: ["Vrai", "Faux"],
        correctAnswer: 0,
        explanation:
          "Le respect des horaires est essentiel pour la satisfaction client.",
        points: 5,
      },
      {
        id: "3",
        question: "Que faire en cas de problème pendant une intervention ?",
        type: "multiple_choice",
        options: [
          "Abandonner la mission",
          "Contacter immédiatement le client et EcoDeli",
          "Improviser une solution",
          "Attendre la fin de la journée",
        ],
        correctAnswer: 1,
        explanation: "La communication est clé en cas de problème.",
        points: 15,
      },
    ];

    return sampleQuestions;
  }

  /**
   * Démarre une session d'examen
   */
  static async startExamSession(
    certificationId: string,
    userId: string,
    userType: "provider" | "deliverer",
  ): Promise<ExamSession> {
    try {
      // Récupérer l'inscription
      let userCertification: any = null;

      if (userType === "provider") {
        const provider = await prisma.provider.findUnique({
          where: { userId },
        });

        userCertification = await prisma.providerCertification.findUnique({
          where: {
            providerId_certificationId: {
              providerId: provider!.id,
              certificationId,
            },
          },
        });
      } else {
        const deliverer = await prisma.deliverer.findUnique({
          where: { userId },
        });

        userCertification = await prisma.delivererCertification.findUnique({
          where: {
            delivererId_certificationId: {
              delivererId: deliverer!.id,
              certificationId,
            },
          },
        });
      }

      if (!userCertification) {
        throw new Error("Inscription non trouvée");
      }

      // Vérifier les tentatives restantes
      const certification = await prisma.certification.findUnique({
        where: { id: certificationId },
      });

      if (userCertification.attempts >= certification!.maxAttempts) {
        throw new Error("Nombre maximum de tentatives atteint");
      }

      // Générer les questions
      const questions = await this.generateExamQuestions(certificationId);

      // Créer la session d'examen
      const examSession = await prisma.examSession.create({
        data: {
          certificationId,
          [userType === "provider"
            ? "providerCertificationId"
            : "delivererCertificationId"]: userCertification.id,
          sessionNumber: userCertification.attempts + 1,
          timeLimit: 60, // 60 minutes par défaut
          questions: questions,
          answers: {},
        },
      });

      return {
        id: examSession.id,
        certificationId,
        sessionNumber: examSession.sessionNumber,
        timeLimit: examSession.timeLimit,
        questions: questions.map((q) => ({
          ...q,
          correctAnswer: undefined, // Ne pas envoyer la bonne réponse
          explanation: undefined,
        })),
        startedAt: examSession.startedAt,
        timeRemaining: examSession.timeLimit * 60, // en secondes
      };
    } catch (error) {
      console.error("Erreur démarrage examen:", error);
      throw error;
    }
  }

  /**
   * Soumet les réponses d'un examen
   */
  static async submitExamAnswers(
    sessionId: string,
    answers: Record<string, any>,
    userId: string,
    userType: "provider" | "deliverer",
  ): Promise<ExamResult> {
    try {
      // Récupérer la session
      const session = await prisma.examSession.findUnique({
        where: { id: sessionId },
        include: {
          certification: true,
        },
      });

      if (!session) {
        throw new Error("Session d'examen non trouvée");
      }

      // Calculer le score
      const questions = session.questions as ExamQuestion[];
      let correctAnswers = 0;
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((question) => {
        totalPoints += question.points;
        const userAnswer = answers[question.id];

        if (userAnswer === question.correctAnswer) {
          correctAnswers++;
          earnedPoints += question.points;
        }
      });

      const score = Math.round((earnedPoints / totalPoints) * 100);
      const isPassed = score >= session.certification.passScore;

      // Calculer le temps passé
      const timeSpent = Math.round(
        (new Date().getTime() - session.startedAt.getTime()) / 1000 / 60,
      ); // en minutes

      // Mettre à jour la session
      await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          completedAt: new Date(),
          score,
          isPassed,
          answers,
        },
      });

      // Mettre à jour l'inscription
      let certificateUrl: string | undefined = undefined;

      if (isPassed) {
        certificateUrl = await this.generateCertificate(
          userType === "provider"
            ? session.providerCertificationId!
            : session.delivererCertificationId!,
          userType,
        );
      }

      const updateData = {
        attempts: { increment: 1 },
        score: isPassed ? score : undefined,
        isValid: isPassed,
        certificateUrl: isPassed ? certificateUrl : undefined,
        completedAt: isPassed ? new Date() : undefined,
        status: isPassed ? "COMPLETED" : "FAILED",
      };

      if (userType === "provider") {
        await prisma.providerCertification.update({
          where: { id: session.providerCertificationId! },
          data: updateData,
        });
      } else {
        await prisma.delivererCertification.update({
          where: { id: session.delivererCertificationId! },
          data: updateData,
        });
      }

      return {
        sessionId,
        score,
        isPassed,
        correctAnswers,
        totalQuestions: questions.length,
        timeSpent,
        feedback: isPassed
          ? "Félicitations ! Vous avez réussi la certification."
          : `Score insuffisant (${score}%). Score minimum requis: ${session.certification.passScore}%.`,
        certificateUrl,
      };
    } catch (error) {
      console.error("Erreur soumission examen:", error);
      throw error;
    }
  }

  // Méthodes utilitaires privées
  private static async generateCertificate(
    userCertificationId: string,
    userType: "provider" | "deliverer",
  ): Promise<string> {
    // Simuler la génération de certificat
    const certificateUrl = `https://ecodeli.fr/certificates/${userType}/${userCertificationId}.pdf`;
    return certificateUrl;
  }

  private static async calculateExpirationDate(
    certificationId: string,
  ): Promise<Date | null> {
    const certification = await prisma.certification.findUnique({
      where: { id: certificationId },
    });

    if (!certification?.validityDuration) return null;

    const expirationDate = new Date();
    expirationDate.setMonth(
      expirationDate.getMonth() + certification.validityDuration,
    );

    return expirationDate;
  }

  /**
   * Vérifier les certifications expirées
   */
  static async checkExpiredCertifications() {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      // Certifications expirant dans 30 jours
      const expiringCertifications = await prisma.$queryRaw`
        SELECT 
          'provider' as entityType,
          pc.providerId as entityId,
          pc.id as certificationRecordId,
          c.name as certificationName,
          pc.expiresAt
        FROM ProviderCertification pc
        JOIN Certification c ON pc.certificationId = c.id
        WHERE pc.expiresAt BETWEEN ${now} AND ${thirtyDaysFromNow}
          AND pc.isValid = true
          AND pc.renewalNotified = false
        
        UNION ALL
        
        SELECT 
          'deliverer' as entityType,
          dc.delivererId as entityId,
          dc.id as certificationRecordId,
          c.name as certificationName,
          dc.expiresAt
        FROM DelivererCertification dc
        JOIN Certification c ON dc.certificationId = c.id
        WHERE dc.expiresAt BETWEEN ${now} AND ${thirtyDaysFromNow}
          AND dc.isValid = true
          AND dc.renewalNotified = false
      `;

      // Envoyer les notifications de renouvellement
      for (const cert of expiringCertifications as any[]) {
        await NotificationService.createNotification({
          recipientId: cert.entityId,
          type: "CERTIFICATION_EXPIRING",
          title: `Certification expirant bientôt: ${cert.certificationName}`,
          content: `Votre certification "${cert.certificationName}" expire le ${new Date(cert.expiresAt).toLocaleDateString()}. Pensez à la renouveler.`,
          metadata: { certificationRecordId: cert.certificationRecordId },
        });

        // Marquer comme notifié
        if (cert.entityType === "provider") {
          await prisma.providerCertification.update({
            where: { id: cert.certificationRecordId },
            data: { renewalNotified: true },
          });
        } else {
          await prisma.delivererCertification.update({
            where: { id: cert.certificationRecordId },
            data: { renewalNotified: true },
          });
        }
      }

      // Marquer les certifications expirées
      await prisma.providerCertification.updateMany({
        where: {
          expiresAt: { lt: now },
          isValid: true,
        },
        data: {
          status: "EXPIRED",
          isValid: false,
        },
      });

      await prisma.delivererCertification.updateMany({
        where: {
          expiresAt: { lt: now },
          isValid: true,
        },
        data: {
          status: "EXPIRED",
          isValid: false,
        },
      });

      return {
        notificationsCount: expiringCertifications.length,
        expiredCount:
          (await prisma.providerCertification.count({
            where: { expiresAt: { lt: now }, status: "EXPIRED" },
          })) +
          (await prisma.delivererCertification.count({
            where: { expiresAt: { lt: now }, status: "EXPIRED" },
          })),
      };
    } catch (error) {
      console.error(
        "Erreur lors de la vérification des certifications expirées:",
        error,
      );
      throw error;
    }
  }

  /**
   * Calculer le score d'un examen (simulation)
   */
  private static calculateExamScore(answers: Record<string, any>): number {
    // Logique de calcul à adapter selon le type d'examen
    // Pour l'instant, retourner un score aléatoire entre 60 et 100
    return Math.floor(Math.random() * 40) + 60;
  }

  /**
   * Vérifier si une certification est complète
   */
  private static async checkCertificationCompletion(
    certificationRecordId: string,
    entityType: "provider" | "deliverer",
  ) {
    try {
      const whereClause =
        entityType === "provider"
          ? { providerCertificationId: certificationRecordId }
          : { delivererCertificationId: certificationRecordId };

      const incompleteModules = await prisma.moduleProgress.count({
        where: {
          ...whereClause,
          status: { not: "COMPLETED" },
        },
      });

      if (incompleteModules === 0) {
        // Tous les modules sont terminés, prêt pour l'examen
        const updateData = { status: "IN_PROGRESS" as const };

        if (entityType === "provider") {
          await prisma.providerCertification.update({
            where: { id: certificationRecordId },
            data: updateData,
          });
        } else {
          await prisma.delivererCertification.update({
            where: { id: certificationRecordId },
            data: updateData,
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de la complétion:", error);
    }
  }

  /**
   * Obtenir les statistiques de certification pour un utilisateur
   */
  static async getCertificationStats(
    entityType: "provider" | "deliverer",
    entityId: string,
  ): Promise<CertificationStats> {
    try {
      const whereClause =
        entityType === "provider"
          ? { providerId: entityId }
          : { delivererId: entityId };

      const table =
        entityType === "provider"
          ? prisma.providerCertification
          : prisma.delivererCertification;

      const [
        totalCertifications,
        activeCertifications,
        completedCount,
        inProgressCount,
        avgScore,
        expiringCount,
      ] = await Promise.all([
        table.count({ where: whereClause }),
        table.count({ where: { ...whereClause, isValid: true } }),
        table.count({ where: { ...whereClause, status: "COMPLETED" } }),
        table.count({ where: { ...whereClause, status: "IN_PROGRESS" } }),
        table.aggregate({
          where: { ...whereClause, score: { not: null } },
          _avg: { score: true },
        }),
        table.count({
          where: {
            ...whereClause,
            expiresAt: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            isValid: true,
          },
        }),
      ]);

      return {
        totalCertifications,
        activeCertifications,
        completedCount,
        inProgressCount,
        averageScore: avgScore._avg.score || 0,
        expiringCount,
      };
    } catch (error) {
      console.error("Erreur lors du calcul des statistiques:", error);
      throw error;
    }
  }
}

// Schémas de validation
export const moduleCompletionSchema = z.object({
  moduleId: z.string(),
  score: z.number().min(0).max(100),
  timeSpent: z.number().positive(),
});

export const examAnswersSchema = z.object({
  sessionId: z.string(),
  answers: z.record(z.any()),
});
