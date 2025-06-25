import { prisma } from '@/lib/db'
import { generateInvoiceNumber } from '@/lib/utils/invoice'
import { generatePDF } from '@/lib/utils/pdf'

export interface ContractTemplate {
  id: string
  name: string
  type: 'STANDARD' | 'PREMIUM' | 'CUSTOM'
  terms: {
    commissionRate: number
    minCommissionFee: number
    paymentTerms: number // jours
    cancellationPolicy: string
    deliveryZones: string[]
    serviceLevel: string
    supportHours: string
    additionalServices?: string[]
  }
  isActive: boolean
}

export interface ContractData {
  merchantId: string
  templateId?: string
  customTerms?: Partial<ContractTemplate['terms']>
  startDate: Date
  endDate?: Date
  signedBy?: string
}

export class ContractService {
  /**
   * Créer un nouveau contrat pour un commerçant
   */
  static async createContract(data: ContractData): Promise<any> {
    try {
      const contractNumber = await this.generateContractNumber()
      
      // Récupérer le template si spécifié
      let terms = {}
      if (data.templateId) {
        const template = await prisma.contractTemplate.findUnique({
          where: { id: data.templateId }
        })
        
        if (template) {
          terms = template.terms as any
        }
      }

      // Appliquer les termes personnalisés
      if (data.customTerms) {
        terms = { ...terms, ...data.customTerms }
      }

      // Créer le contrat
      const contract = await prisma.contract.create({
        data: {
          merchantId: data.merchantId,
          contractNumber,
          type: data.templateId ? 'STANDARD' : 'CUSTOM',
          terms,
          commissionRate: (terms as any).commissionRate || 0.15,
          startDate: data.startDate,
          endDate: data.endDate,
          status: 'DRAFT',
          signedBy: data.signedBy
        },
        include: {
          merchant: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      })

      // Générer le PDF du contrat
      const pdfUrl = await this.generateContractPDF(contract)
      
      // Mettre à jour avec l'URL du PDF
      await prisma.contract.update({
        where: { id: contract.id },
        data: { pdfUrl }
      })

      return { ...contract, pdfUrl }

    } catch (error) {
      console.error('Erreur création contrat:', error)
      throw new Error('Impossible de créer le contrat')
    }
  }

  /**
   * Signer un contrat
   */
  static async signContract(
    contractId: string, 
    signedBy: string, 
    signature?: string
  ): Promise<any> {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: {
          merchant: {
            include: {
              user: {
                include: {
                  profile: true
                }
              }
            }
          }
        }
      })

      if (!contract) {
        throw new Error('Contrat non trouvé')
      }

      if (contract.status !== 'DRAFT') {
        throw new Error('Ce contrat ne peut plus être signé')
      }

      // Mettre à jour le contrat
      const signedContract = await prisma.$transaction(async (tx) => {
        // 1. Signer le contrat
        const updated = await tx.contract.update({
          where: { id: contractId },
          data: {
            status: 'ACTIVE',
            signedAt: new Date(),
            signedBy,
            signature
          }
        })

        // 2. Mettre à jour le statut du merchant
        await tx.merchant.update({
          where: { id: contract.merchantId },
          data: {
            contractStatus: 'ACTIVE',
            contractStartDate: contract.startDate,
            contractEndDate: contract.endDate,
            commissionRate: contract.commissionRate
          }
        })

        // 3. Créer une notification
        await tx.notification.create({
          data: {
            userId: contract.merchant.userId,
            type: 'CONTRACT_SIGNED',
            title: 'Contrat signé avec succès !',
            message: `Votre contrat ${contract.contractNumber} est maintenant actif.`,
            data: {
              contractId: contract.id,
              contractNumber: contract.contractNumber
            }
          }
        })

        return updated
      })

      return signedContract

    } catch (error) {
      console.error('Erreur signature contrat:', error)
      throw error
    }
  }

  /**
   * Récupérer les contrats d'un commerçant
   */
  static async getMerchantContracts(merchantId: string): Promise<any[]> {
    try {
      return await prisma.contract.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: {
            include: {
              user: {
                select: {
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        }
      })

    } catch (error) {
      console.error('Erreur récupération contrats:', error)
      throw new Error('Impossible de récupérer les contrats')
    }
  }

  /**
   * Résilier un contrat
   */
  static async terminateContract(
    contractId: string, 
    reason: string,
    terminatedBy: string
  ): Promise<any> {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        include: { merchant: true }
      })

      if (!contract) {
        throw new Error('Contrat non trouvé')
      }

      if (contract.status !== 'ACTIVE') {
        throw new Error('Ce contrat ne peut pas être résilié')
      }

      // Mettre à jour le contrat et le merchant
      const terminatedContract = await prisma.$transaction(async (tx) => {
        // 1. Marquer le contrat comme terminé
        const updated = await tx.contract.update({
          where: { id: contractId },
          data: {
            status: 'TERMINATED',
            endDate: new Date(),
            terminationReason: reason,
            terminatedBy
          }
        })

        // 2. Mettre à jour le statut du merchant
        await tx.merchant.update({
          where: { id: contract.merchantId },
          data: {
            contractStatus: 'TERMINATED',
            contractEndDate: new Date()
          }
        })

        // 3. Désactiver les annonces actives du merchant
        await tx.announcement.updateMany({
          where: {
            merchantId: contract.merchantId,
            status: 'PUBLISHED'
          },
          data: {
            status: 'CANCELLED'
          }
        })

        // 4. Créer une notification
        await tx.notification.create({
          data: {
            userId: contract.merchant.userId,
            type: 'CONTRACT_TERMINATED',
            title: 'Contrat résilié',
            message: `Votre contrat ${contract.contractNumber} a été résilié. Raison: ${reason}`,
            data: {
              contractId: contract.id,
              reason
            }
          }
        })

        return updated
      })

      return terminatedContract

    } catch (error) {
      console.error('Erreur résiliation contrat:', error)
      throw error
    }
  }

  /**
   * Renouveler un contrat
   */
  static async renewContract(
    contractId: string,
    newEndDate: Date,
    updatedTerms?: Partial<ContractTemplate['terms']>
  ): Promise<any> {
    try {
      const existingContract = await prisma.contract.findUnique({
        where: { id: contractId }
      })

      if (!existingContract) {
        throw new Error('Contrat non trouvé')
      }

      // Préparer les nouveaux termes
      const currentTerms = existingContract.terms as any
      const newTerms = updatedTerms ? { ...currentTerms, ...updatedTerms } : currentTerms

      // Créer un nouveau contrat pour le renouvellement
      const renewedContract = await this.createContract({
        merchantId: existingContract.merchantId,
        customTerms: newTerms,
        startDate: existingContract.endDate || new Date(),
        endDate: newEndDate
      })

      // Marquer l'ancien contrat comme expiré
      await prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'EXPIRED',
          renewalContractId: renewedContract.id
        }
      })

      return renewedContract

    } catch (error) {
      console.error('Erreur renouvellement contrat:', error)
      throw error
    }
  }

  /**
   * Générer un numéro de contrat unique
   */
  private static async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    
    const count = await prisma.contract.count({
      where: {
        contractNumber: {
          startsWith: `CT-${year}${month}`
        }
      }
    })

    return `CT-${year}${month}-${String(count + 1).padStart(4, '0')}`
  }

  /**
   * Générer le PDF du contrat
   */
  private static async generateContractPDF(contract: any): Promise<string> {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Contrat EcoDeli - ${contract.contractNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
              .contract-info { margin-bottom: 30px; }
              .section { margin-bottom: 25px; }
              .terms { margin-left: 20px; }
              .signature-zone { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">🌱 EcoDeli</div>
              <h1>Contrat de Partenariat Commercial</h1>
            </div>

            <div class="contract-info">
              <p><strong>Numéro de contrat:</strong> ${contract.contractNumber}</p>
              <p><strong>Date de création:</strong> ${new Date(contract.createdAt).toLocaleDateString('fr-FR')}</p>
              <p><strong>Type:</strong> ${contract.type}</p>
              <p><strong>Commerçant:</strong> ${contract.merchant.companyName}</p>
              <p><strong>SIRET:</strong> ${contract.merchant.siret}</p>
            </div>

            <div class="section">
              <h2>Article 1 - Objet du contrat</h2>
              <p>Le présent contrat définit les conditions de partenariat entre EcoDeli et le commerçant pour la fourniture de services de livraison éco-responsable.</p>
            </div>

            <div class="section">
              <h2>Article 2 - Conditions tarifaires</h2>
              <div class="terms">
                <p><strong>Taux de commission:</strong> ${(contract.commissionRate * 100).toFixed(2)}%</p>
                <p><strong>Commission minimale:</strong> ${contract.terms?.minCommissionFee || 'N/A'}€</p>
                <p><strong>Délai de paiement:</strong> ${contract.terms?.paymentTerms || 30} jours</p>
              </div>
            </div>

            <div class="section">
              <h2>Article 3 - Zones de livraison</h2>
              <div class="terms">
                ${contract.terms?.deliveryZones ? 
                  contract.terms.deliveryZones.map((zone: string) => `<p>• ${zone}</p>`).join('') : 
                  '<p>Selon accord commercial</p>'
                }
              </div>
            </div>

            <div class="section">
              <h2>Article 4 - Durée du contrat</h2>
              <div class="terms">
                <p><strong>Date de début:</strong> ${new Date(contract.startDate).toLocaleDateString('fr-FR')}</p>
                ${contract.endDate ? 
                  `<p><strong>Date de fin:</strong> ${new Date(contract.endDate).toLocaleDateString('fr-FR')}</p>` : 
                  '<p><strong>Durée:</strong> Indéterminée</p>'
                }
              </div>
            </div>

            <div class="signature-zone">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <p><strong>EcoDeli</strong></p>
                  <p>Signature:</p>
                  <div style="height: 60px; border-bottom: 1px solid #000; width: 200px; margin-top: 20px;"></div>
                  <p>Date: ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p><strong>${contract.merchant.companyName}</strong></p>
                  <p>Signature:</p>
                  <div style="height: 60px; border-bottom: 1px solid #000; width: 200px; margin-top: 20px;"></div>
                  <p>Date: _______________</p>
                </div>
              </div>
            </div>

            <div style="margin-top: 40px; font-size: 12px; color: #666;">
              <p>Ce document a été généré automatiquement par la plateforme EcoDeli le ${new Date().toLocaleString('fr-FR')}.</p>
            </div>
          </body>
        </html>
      `

      const fileName = `contract-${contract.contractNumber}.pdf`
      const pdfUrl = await generatePDF(htmlContent, fileName)
      
      return pdfUrl

    } catch (error) {
      console.error('Erreur génération PDF contrat:', error)
      return ''
    }
  }

  /**
   * Obtenir les statistiques des contrats
   */
  static async getContractStats(): Promise<any> {
    try {
      const [total, active, pending, terminated] = await Promise.all([
        prisma.contract.count(),
        prisma.contract.count({ where: { status: 'ACTIVE' } }),
        prisma.contract.count({ where: { status: 'DRAFT' } }),
        prisma.contract.count({ where: { status: 'TERMINATED' } })
      ])

      const recentContracts = await prisma.contract.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: {
            include: {
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return {
        total,
        active,
        pending,
        terminated,
        recentContracts
      }

    } catch (error) {
      console.error('Erreur statistiques contrats:', error)
      throw new Error('Impossible de récupérer les statistiques')
    }
  }
}