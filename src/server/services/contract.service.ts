import { db } from '../db';
import { TRPCError } from '@trpc/server';
import { ContractStatus, ContractType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { format, addMonths, parseISO } from 'date-fns';
import crypto from 'crypto';

export interface ContractCreateInput {
  merchantId: string;
  templateId?: string;
  title: string;
  content: string;
  type: ContractType;
  monthlyFee?: number;
  commissionRate?: number;
  minimumVolume?: number;
  effectiveDate?: Date;
  expiresAt?: Date;
  terms?: Record<string, any>;
  notes?: string;
}

export interface ContractUpdateInput {
  title?: string;
  content?: string;
  monthlyFee?: number;
  commissionRate?: number;
  minimumVolume?: number;
  effectiveDate?: Date;
  expiresAt?: Date;
  terms?: Record<string, any>;
  notes?: string;
  status?: ContractStatus;
}

export interface ContractSignInput {
  contractId: string;
  merchantSignature: string;
  signedById?: string; // Pour signature admin
}

export interface ContractTemplateCreateInput {
  name: string;
  description?: string;
  content: string;
  defaultType: ContractType;
  defaultMonthlyFee?: number;
  defaultCommissionRate?: number;
  defaultDuration?: number;
  createdById: string;
}

/**
 * Service de gestion des contrats
 */
export class ContractService {
  /**
   * Génère un numéro de contrat unique
   */
  private async generateContractNumber(): Promise<string> {
    const date = format(new Date(), 'yyyyMM');
    const count = await db.contract.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });
    
    return `CONT-${date}-${(count + 1).toString().padStart(4, '0')}`;
  }

  /**
   * Crée un nouveau contrat
   */
  async createContract(data: ContractCreateInput) {
    const contractNumber = await this.generateContractNumber();
    
    // Vérifier que le merchant existe
    const merchant = await db.merchant.findUnique({
      where: { id: data.merchantId },
      include: { user: true }
    });
    
    if (!merchant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Commerçant non trouvé'
      });
    }

    // Récupérer le template si spécifié
    let templateData = null;
    if (data.templateId) {
      templateData = await db.contractTemplate.findUnique({
        where: { id: data.templateId }
      });
      
      if (!templateData) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template de contrat non trouvé'
        });
      }
    }

    // Créer le contrat
    const contract = await db.contract.create({
      data: {
        contractNumber,
        merchantId: data.merchantId,
        templateId: data.templateId,
        title: data.title,
        content: data.content,
        type: data.type,
        status: ContractStatus.DRAFT,
        monthlyFee: data.monthlyFee ? new Decimal(data.monthlyFee) : null,
        commissionRate: data.commissionRate ? new Decimal(data.commissionRate) : null,
        minimumVolume: data.minimumVolume,
        effectiveDate: data.effectiveDate,
        expiresAt: data.expiresAt,
        terms: data.terms,
        notes: data.notes,
        metadata: {
          createdFromTemplate: !!data.templateId,
          templateVersion: templateData?.version || null
        }
      },
      include: {
        merchant: {
          include: { user: true }
        },
        template: true
      }
    });

    return contract;
  }

  /**
   * Met à jour un contrat
   */
  async updateContract(contractId: string, data: ContractUpdateInput) {
    const contract = await db.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contrat non trouvé'
      });
    }

    // Certaines modifications ne sont autorisées que sur les brouillons
    if (contract.status !== ContractStatus.DRAFT && 
        (data.content || data.monthlyFee || data.commissionRate)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Les modifications de contenu ne sont autorisées que sur les brouillons'
      });
    }

    return await db.contract.update({
      where: { id: contractId },
      data: {
        title: data.title,
        content: data.content,
        monthlyFee: data.monthlyFee ? new Decimal(data.monthlyFee) : undefined,
        commissionRate: data.commissionRate ? new Decimal(data.commissionRate) : undefined,
        minimumVolume: data.minimumVolume,
        effectiveDate: data.effectiveDate,
        expiresAt: data.expiresAt,
        terms: data.terms,
        notes: data.notes,
        status: data.status
      },
      include: {
        merchant: {
          include: { user: true }
        },
        template: true
      }
    });
  }

  /**
   * Signe un contrat (merchant ou admin)
   */
  async signContract(data: ContractSignInput) {
    const contract = await db.contract.findUnique({
      where: { id: data.contractId },
      include: {
        merchant: {
          include: { user: true }
        }
      }
    });

    if (!contract) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contrat non trouvé'
      });
    }

    if (contract.status !== ContractStatus.DRAFT && 
        contract.status !== ContractStatus.PENDING_SIGNATURE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Ce contrat ne peut plus être signé'
      });
    }

    const updateData: any = {
      merchantSignature: data.merchantSignature,
      signedAt: new Date()
    };

    // Si signature admin
    if (data.signedById) {
      updateData.signedById = data.signedById;
      updateData.adminSignature = `admin_signature_${Date.now()}`;
      updateData.validatedAt = new Date();
      updateData.status = ContractStatus.ACTIVE;
      
      // Si pas de date d'entrée en vigueur, utiliser maintenant
      if (!contract.effectiveDate) {
        updateData.effectiveDate = new Date();
      }
    } else {
      // Signature merchant seulement
      updateData.status = ContractStatus.PENDING_SIGNATURE;
    }

    return await db.contract.update({
      where: { id: data.contractId },
      data: updateData,
      include: {
        merchant: {
          include: { user: true }
        },
        template: true
      }
    });
  }

  /**
   * Récupère les contrats d'un merchant
   */
  async getMerchantContracts(
    merchantId: string, 
    options: {
      status?: ContractStatus;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const where: any = { merchantId };
    if (status) {
      where.status = status;
    }

    const [contracts, total] = await Promise.all([
      db.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          template: true,
          amendments: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      }),
      db.contract.count({ where })
    ]);

    return {
      data: contracts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Récupère le contrat actif d'un merchant
   */
  async getActiveMerchantContract(merchantId: string) {
    return await db.contract.findFirst({
      where: {
        merchantId,
        status: ContractStatus.ACTIVE,
        effectiveDate: { lte: new Date() },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        template: true,
        amendments: {
          where: { status: ContractStatus.ACTIVE },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Termine un contrat
   */
  async terminateContract(contractId: string, reason?: string) {
    const contract = await db.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contrat non trouvé'
      });
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seuls les contrats actifs peuvent être résiliés'
      });
    }

    return await db.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.TERMINATED,
        notes: reason ? `${contract.notes || ''}\nRésilié: ${reason}` : contract.notes
      }
    });
  }

  /**
   * Renouvelle un contrat
   */
  async renewContract(contractId: string, newExpiryDate: Date) {
    const contract = await db.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contrat non trouvé'
      });
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seuls les contrats actifs peuvent être renouvelés'
      });
    }

    return await db.contract.update({
      where: { id: contractId },
      data: {
        expiresAt: newExpiryDate,
        metadata: {
          ...contract.metadata as any,
          renewed: true,
          renewedAt: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Crée un template de contrat
   */
  async createContractTemplate(data: ContractTemplateCreateInput) {
    return await db.contractTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        content: data.content,
        defaultType: data.defaultType,
        defaultMonthlyFee: data.defaultMonthlyFee ? new Decimal(data.defaultMonthlyFee) : null,
        defaultCommissionRate: data.defaultCommissionRate ? new Decimal(data.defaultCommissionRate) : null,
        defaultDuration: data.defaultDuration,
        createdById: data.createdById
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Liste les templates actifs
   */
  async getActiveTemplates() {
    return await db.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * Crée un amendement à un contrat
   */
  async createAmendment(
    contractId: string, 
    title: string, 
    description: string, 
    content: string
  ) {
    const contract = await db.contract.findUnique({
      where: { id: contractId }
    });

    if (!contract) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contrat non trouvé'
      });
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seuls les contrats actifs peuvent être amendés'
      });
    }

    return await db.contractAmendment.create({
      data: {
        contractId,
        title,
        description,
        content,
        status: ContractStatus.DRAFT
      }
    });
  }

  /**
   * Récupère les statistiques des contrats
   */
  async getContractStats(adminOnly = true) {
    const [
      totalContracts,
      activeContracts,
      pendingContracts,
      expiredContracts,
      contractsByType
    ] = await Promise.all([
      db.contract.count(),
      db.contract.count({ where: { status: ContractStatus.ACTIVE } }),
      db.contract.count({ where: { status: ContractStatus.PENDING_SIGNATURE } }),
      db.contract.count({ where: { status: ContractStatus.EXPIRED } }),
      db.contract.groupBy({
        by: ['type'],
        _count: { _all: true }
      })
    ]);

    return {
      total: totalContracts,
      active: activeContracts,
      pending: pendingContracts,
      expired: expiredContracts,
      byType: contractsByType.reduce((acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Vérifie les contrats expirant bientôt
   */
  async getExpiringContracts(daysAhead = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await db.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        expiresAt: {
          lte: futureDate,
          gt: new Date()
        }
      },
      include: {
        merchant: {
          include: { user: true }
        }
      },
      orderBy: { expiresAt: 'asc' }
    });
  }

  /**
   * Marque les contrats expirés
   */
  async markExpiredContracts() {
    const now = new Date();
    
    const expiredContracts = await db.contract.updateMany({
      where: {
        status: ContractStatus.ACTIVE,
        expiresAt: {
          lt: now
        }
      },
      data: {
        status: ContractStatus.EXPIRED
      }
    });

    return expiredContracts.count;
  }

  /**
   * Génère le PDF d'un contrat
   */
  async generateContractPdf(contractId: string) {
    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: {
        merchant: {
          include: { user: true }
        },
        template: true
      }
    });

    if (!contract) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Contrat non trouvé'
      });
    }

    // En mode démo, retourner une URL simulée
    if (process.env.DEMO_MODE === 'true') {
      const fileHash = crypto.createHash('md5')
        .update(`${contract.id}-${Date.now()}`)
        .digest('hex')
        .substring(0, 8);
      
      return `/demo/contracts/${contract.contractNumber}-${fileHash}.pdf`;
    }

    // TODO: Implémenter la génération PDF réelle
    // Utiliser un service comme Puppeteer ou une API externe
    
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: 'Génération PDF non encore implémentée'
    });
  }
}

// Exporter une instance du service
export const contractService = new ContractService();