import { db } from "@/lib/db";
import {
  generatePDF,
  createDocumentTemplate,
  generateInvoiceNumber,
  formatCurrency,
  formatDate,
} from "@/lib/utils/pdf";
import QRCode from "qrcode";

interface DeliverySlipData {
  announcementId: string;
  deliveryId: string;
  validationCode: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageDetails: {
    weight?: number;
    dimensions?: string;
    fragile?: boolean;
    description: string;
  };
  customerInfo: {
    name: string;
    phone: string;
    email: string;
  };
  delivererInfo: {
    name: string;
    phone: string;
    vehicleInfo?: string;
  };
  timeline: {
    createdAt: Date;
    pickupDate?: Date;
    deliveryDate?: Date;
    estimatedDuration: number;
  };
  pricing: {
    basePrice: number;
    finalPrice?: number;
    urgentSurcharge?: number;
    insuranceFee?: number;
  };
  specialInstructions?: string;
}

interface ContractData {
  contractId: string;
  providerInfo: {
    name: string;
    businessName: string;
    siret: string;
    address: string;
    email: string;
    phone: string;
  };
  clientInfo: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  serviceDetails: {
    type: string;
    description: string;
    duration: string;
    location: string;
  };
  financialTerms: {
    totalAmount: number;
    paymentSchedule: string;
    paymentMethod: string;
    lateFees?: number;
  };
  contractDates: {
    startDate: Date;
    endDate: Date;
    signedDate?: Date;
  };
  terms: string[];
}

interface InvoiceData {
  invoiceNumber: string;
  customerInfo: {
    name: string;
    address: string;
    email: string;
    vatNumber?: string;
  };
  companyInfo: {
    name: string;
    address: string;
    siret: string;
    vatNumber: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    vatAmount: number;
    total: number;
  };
  paymentInfo: {
    dueDate: Date;
    paymentMethod: string;
    bankDetails?: string;
  };
}

class PDFGeneratorService {
  /**
   * Générer un bordereau de livraison complet
   */
  async generateDeliverySlip(announcementId: string): Promise<string> {
    try {
      // Récupérer les données de l'annonce
      const announcement = await db.announcement.findUnique({
        where: { id: announcementId },
        include: {
          author: {
            include: { profile: true },
          },
          deliverer: {
            include: { profile: true },
          },
          delivery: {
            include: {
              validationCodes: {
                where: { isUsed: false },
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (!announcement) {
        throw new Error("Annonce introuvable");
      }

      const deliverySlipData: DeliverySlipData = {
        announcementId: announcement.id,
        deliveryId: announcement.delivery?.id || "",
        validationCode:
          announcement.delivery?.validationCodes[0]?.code || "N/A",
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        packageDetails: {
          weight: announcement.packageWeight,
          dimensions: announcement.packageDimensions,
          fragile: announcement.packageFragile,
          description: announcement.description,
        },
        customerInfo: {
          name: `${announcement.author.profile?.firstName} ${announcement.author.profile?.lastName}`,
          phone: announcement.author.profile?.phone || "N/A",
          email: announcement.author.email,
        },
        delivererInfo: {
          name: announcement.deliverer
            ? `${announcement.deliverer.profile?.firstName} ${announcement.deliverer.profile?.lastName}`
            : "Non assigné",
          phone: announcement.deliverer?.profile?.phone || "N/A",
          vehicleInfo: announcement.deliverer?.profile?.vehicleInfo,
        },
        timeline: {
          createdAt: announcement.createdAt,
          pickupDate: announcement.pickupDate,
          deliveryDate: announcement.deliveryDate,
          estimatedDuration: 60, // minutes
        },
        pricing: {
          basePrice: announcement.basePrice,
          finalPrice: announcement.finalPrice,
          urgentSurcharge: announcement.isUrgent
            ? announcement.basePrice * 0.2
            : 0,
          insuranceFee: announcement.requiresInsurance ? 5 : 0,
        },
        specialInstructions: announcement.specialInstructions,
      };

      const htmlContent = await this.createDeliverySlipHTML(deliverySlipData);
      const fileName = `bordereau-livraison-${announcementId}.pdf`;

      return await generatePDF(htmlContent, fileName);
    } catch (error) {
      console.error("Error generating delivery slip:", error);
      throw new Error("Erreur lors de la génération du bordereau de livraison");
    }
  }

  /**
   * Générer un contrat de service
   */
  async generateServiceContract(contractId: string): Promise<string> {
    try {
      const contract = await db.contract.findUnique({
        where: { id: contractId },
        include: {
          provider: {
            include: { profile: true },
          },
          client: {
            include: { profile: true },
          },
        },
      });

      if (!contract) {
        throw new Error("Contrat introuvable");
      }

      const contractData: ContractData = {
        contractId: contract.id,
        providerInfo: {
          name: `${contract.provider.profile?.firstName} ${contract.provider.profile?.lastName}`,
          businessName: contract.provider.profile?.businessName || "N/A",
          siret: contract.provider.profile?.siret || "N/A",
          address: contract.provider.profile?.address || "N/A",
          email: contract.provider.email,
          phone: contract.provider.profile?.phone || "N/A",
        },
        clientInfo: {
          name: `${contract.client.profile?.firstName} ${contract.client.profile?.lastName}`,
          address: contract.client.profile?.address || "N/A",
          email: contract.client.email,
          phone: contract.client.profile?.phone || "N/A",
        },
        serviceDetails: {
          type: contract.serviceType,
          description: contract.description,
          duration: contract.duration,
          location: contract.location,
        },
        financialTerms: {
          totalAmount: contract.totalAmount,
          paymentSchedule: contract.paymentSchedule,
          paymentMethod: contract.paymentMethod,
          lateFees: contract.lateFees,
        },
        contractDates: {
          startDate: contract.startDate,
          endDate: contract.endDate,
          signedDate: contract.signedDate,
        },
        terms: contract.terms as string[],
      };

      const htmlContent = await this.createContractHTML(contractData);
      const fileName = `contrat-${contractId}.pdf`;

      return await generatePDF(htmlContent, fileName);
    } catch (error) {
      console.error("Error generating contract:", error);
      throw new Error("Erreur lors de la génération du contrat");
    }
  }

  /**
   * Générer une facture
   */
  async generateInvoice(paymentId: string): Promise<string> {
    try {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          announcement: {
            include: {
              author: {
                include: { profile: true },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Paiement introuvable");
      }

      const invoiceData: InvoiceData = {
        invoiceNumber: generateInvoiceNumber(),
        customerInfo: {
          name: `${payment.announcement.author.profile?.firstName} ${payment.announcement.author.profile?.lastName}`,
          address: payment.announcement.author.profile?.address || "N/A",
          email: payment.announcement.author.email,
          vatNumber: payment.announcement.author.profile?.vatNumber,
        },
        companyInfo: {
          name: "EcoDeli SAS",
          address: "123 Avenue des Livraisons Écologiques, 75001 Paris",
          siret: "12345678901234",
          vatNumber: "FR12345678901",
        },
        items: [
          {
            description: payment.announcement.title,
            quantity: 1,
            unitPrice: payment.amount,
            vatRate: 20,
            total: payment.amount,
          },
        ],
        totals: {
          subtotal: payment.amount / 1.2,
          vatAmount: payment.amount - payment.amount / 1.2,
          total: payment.amount,
        },
        paymentInfo: {
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
          paymentMethod: payment.paymentMethod,
          bankDetails: "IBAN: FR76 1234 5678 9012 3456 78",
        },
      };

      const htmlContent = await this.createInvoiceHTML(invoiceData);
      const fileName = `facture-${invoiceData.invoiceNumber}.pdf`;

      return await generatePDF(htmlContent, fileName);
    } catch (error) {
      console.error("Error generating invoice:", error);
      throw new Error("Erreur lors de la génération de la facture");
    }
  }

  /**
   * Générer un certificat de livraison
   */
  async generateDeliveryCertificate(deliveryId: string): Promise<string> {
    try {
      const delivery = await db.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          announcement: {
            include: {
              author: { include: { profile: true } },
              deliverer: { include: { profile: true } },
            },
          },
          validationCodes: {
            where: { isUsed: true },
            orderBy: { usedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!delivery || delivery.status !== "DELIVERED") {
        throw new Error("Livraison non trouvée ou non complétée");
      }

      const validationCode = delivery.validationCodes[0];
      const qrCodeDataURL = await QRCode.toDataURL(
        `${process.env.NEXTAUTH_URL}/verify/delivery/${delivery.id}?code=${validationCode.code}`,
      );

      const htmlContent = await this.createDeliveryCertificateHTML({
        delivery,
        qrCodeDataURL,
        validationCode: validationCode.code,
        deliveredAt: delivery.deliveredAt!,
        customerName: `${delivery.announcement.author.profile?.firstName} ${delivery.announcement.author.profile?.lastName}`,
        delivererName: `${delivery.announcement.deliverer?.profile?.firstName} ${delivery.announcement.deliverer?.profile?.lastName}`,
        announcementTitle: delivery.announcement.title,
        pickupAddress: delivery.announcement.pickupAddress,
        deliveryAddress: delivery.announcement.deliveryAddress,
      });

      const fileName = `certificat-livraison-${deliveryId}.pdf`;

      return await generatePDF(htmlContent, fileName);
    } catch (error) {
      console.error("Error generating delivery certificate:", error);
      throw new Error(
        "Erreur lors de la génération du certificat de livraison",
      );
    }
  }

  // Méthodes privées pour générer le HTML

  private async createDeliverySlipHTML(
    data: DeliverySlipData,
  ): Promise<string> {
    const qrCodeDataURL = await QRCode.toDataURL(
      `${process.env.NEXTAUTH_URL}/delivery/track/${data.deliveryId}?code=${data.validationCode}`,
    );

    const content = `
      <div class="section">
        <div class="section-title">📦 Informations de Livraison</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Numéro d'annonce</div>
            <div class="info-value">${data.announcementId}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Code de validation</div>
            <div class="info-value" style="font-weight: bold; font-size: 18px; color: #2563eb;">${data.validationCode}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date de création</div>
            <div class="info-value">${formatDate(data.timeline.createdAt)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Durée estimée</div>
            <div class="info-value">${data.timeline.estimatedDuration} minutes</div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrCodeDataURL}" alt="QR Code" style="width: 120px; height: 120px;" />
          <p style="margin: 10px 0; font-size: 12px; color: #64748b;">
            Scannez ce QR code pour suivre la livraison
          </p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📍 Adresses</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Adresse de récupération</div>
            <div class="info-value">${data.pickupAddress}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Adresse de livraison</div>
            <div class="info-value">${data.deliveryAddress}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">DÉTAILS DU COLIS</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Description</div>
            <div class="info-value">${data.packageDetails.description}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Poids</div>
            <div class="info-value">${data.packageDetails.weight ? data.packageDetails.weight + " kg" : "Non spécifié"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Dimensions</div>
            <div class="info-value">${data.packageDetails.dimensions || "Non spécifiées"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Fragile</div>
                          <div class="info-value">${data.packageDetails.fragile ? "OUI" : "Non"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👥 Informations Contacts</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Client</div>
            <div class="info-value">${data.customerInfo.name}</div>
            <div class="info-value">${data.customerInfo.phone}</div>
            <div class="info-value">${data.customerInfo.email}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Livreur</div>
            <div class="info-value">${data.delivererInfo.name}</div>
            <div class="info-value">${data.delivererInfo.phone}</div>
            ${data.delivererInfo.vehicleInfo ? `<div class="info-value">Véhicule: ${data.delivererInfo.vehicleInfo}</div>` : ""}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 Tarification</div>
        <table class="table">
          <tr>
            <td>Prix de base</td>
            <td style="text-align: right;">${formatCurrency(data.pricing.basePrice)}</td>
          </tr>
          ${
            data.pricing.urgentSurcharge
              ? `
          <tr>
            <td>Supplément urgent</td>
            <td style="text-align: right;">${formatCurrency(data.pricing.urgentSurcharge)}</td>
          </tr>
          `
              : ""
          }
          ${
            data.pricing.insuranceFee
              ? `
          <tr>
            <td>Assurance</td>
            <td style="text-align: right;">${formatCurrency(data.pricing.insuranceFee)}</td>
          </tr>
          `
              : ""
          }
          <tr style="font-weight: bold; border-top: 2px solid #e2e8f0;">
            <td>Prix final</td>
            <td style="text-align: right;">${formatCurrency(data.pricing.finalPrice || data.pricing.basePrice)}</td>
          </tr>
        </table>
      </div>

      ${
        data.specialInstructions
          ? `
      <div class="section">
        <div class="section-title">📝 Instructions Spéciales</div>
        <div style="padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          ${data.specialInstructions}
        </div>
      </div>
      `
          : ""
      }

      <div class="signature-zone">
        <div class="signature-box">
          <strong>Signature du Client</strong>
          <br><br><br>
          <div style="border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 10px;">
            Date et signature
          </div>
        </div>
        <div class="signature-box">
          <strong>Signature du Livreur</strong>
          <br><br><br>
          <div style="border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 10px;">
            Date et signature
          </div>
        </div>
      </div>
    `;

    return createDocumentTemplate("Bordereau de Livraison", content);
  }

  private async createContractHTML(data: ContractData): Promise<string> {
    const content = `
      <div class="section">
        <div class="section-title">📄 Informations du Contrat</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Numéro de contrat</div>
            <div class="info-value">${data.contractId}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date de signature</div>
            <div class="info-value">${data.contractDates.signedDate ? formatDate(data.contractDates.signedDate) : "Non signé"}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date de début</div>
            <div class="info-value">${formatDate(data.contractDates.startDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date de fin</div>
            <div class="info-value">${formatDate(data.contractDates.endDate)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🏢 Prestataire</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nom</div>
            <div class="info-value">${data.providerInfo.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Entreprise</div>
            <div class="info-value">${data.providerInfo.businessName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">SIRET</div>
            <div class="info-value">${data.providerInfo.siret}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">${data.providerInfo.email}<br>${data.providerInfo.phone}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Client</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nom</div>
            <div class="info-value">${data.clientInfo.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Adresse</div>
            <div class="info-value">${data.clientInfo.address}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${data.clientInfo.email}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Téléphone</div>
            <div class="info-value">${data.clientInfo.phone}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">DÉTAILS DU SERVICE</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Type de service</div>
            <div class="info-value">${data.serviceDetails.type}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Durée</div>
            <div class="info-value">${data.serviceDetails.duration}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Lieu d'intervention</div>
            <div class="info-value">${data.serviceDetails.location}</div>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <div class="info-label">Description détaillée</div>
          <div class="info-value" style="padding: 15px; background-color: #f8fafc; border-radius: 4px;">
            ${data.serviceDetails.description}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 Conditions Financières</div>
        <table class="table">
          <tr>
            <td>Montant total</td>
            <td style="text-align: right; font-weight: bold;">${formatCurrency(data.financialTerms.totalAmount)}</td>
          </tr>
          <tr>
            <td>Modalités de paiement</td>
            <td style="text-align: right;">${data.financialTerms.paymentSchedule}</td>
          </tr>
          <tr>
            <td>Méthode de paiement</td>
            <td style="text-align: right;">${data.financialTerms.paymentMethod}</td>
          </tr>
          ${
            data.financialTerms.lateFees
              ? `
          <tr>
            <td>Pénalités de retard</td>
            <td style="text-align: right;">${formatCurrency(data.financialTerms.lateFees)} par jour</td>
          </tr>
          `
              : ""
          }
        </table>
      </div>

      <div class="section">
        <div class="section-title">CONDITIONS GÉNÉRALES</div>
        <ol style="padding-left: 20px; line-height: 1.8;">
          ${data.terms.map((term) => `<li>${term}</li>`).join("")}
        </ol>
      </div>

      <div class="signature-zone">
        <div class="signature-box">
          <strong>Client</strong>
          <br><br><br>
          <div style="border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 10px;">
            Lu et approuvé<br>
            Date et signature
          </div>
        </div>
        <div class="signature-box">
          <strong>Prestataire</strong>
          <br><br><br>
          <div style="border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 10px;">
            Lu et approuvé<br>
            Date et signature
          </div>
        </div>
      </div>
    `;

    return createDocumentTemplate("Contrat de Service", content);
  }

  private async createInvoiceHTML(data: InvoiceData): Promise<string> {
    const content = `
      <div class="section">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <div>
            <div class="section-title">📄 Facture N° ${data.invoiceNumber}</div>
            <div class="info-item">
              <div class="info-label">Date d'émission</div>
              <div class="info-value">${formatDate(new Date())}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Date d'échéance</div>
              <div class="info-value">${formatDate(data.paymentInfo.dueDate)}</div>
            </div>
          </div>
          <div>
            <div class="section-title">🏢 Émetteur</div>
            <div class="info-value">
              <strong>${data.companyInfo.name}</strong><br>
              ${data.companyInfo.address}<br>
              SIRET: ${data.companyInfo.siret}<br>
              TVA: ${data.companyInfo.vatNumber}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👤 Facturé à</div>
        <div class="info-value">
          <strong>${data.customerInfo.name}</strong><br>
          ${data.customerInfo.address}<br>
          ${data.customerInfo.email}
          ${data.customerInfo.vatNumber ? `<br>TVA: ${data.customerInfo.vatNumber}` : ""}
        </div>
      </div>

      <div class="section">
                  <div class="section-title">DÉTAIL DES PRESTATIONS</div>
        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qté</th>
              <th style="text-align: right;">Prix Unit.</th>
              <th style="text-align: center;">TVA</th>
              <th style="text-align: right;">Total HT</th>
            </tr>
          </thead>
          <tbody>
            ${data.items
              .map(
                (item) => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">${formatCurrency(item.unitPrice / 1.2)}</td>
                <td style="text-align: center;">${item.vatRate}%</td>
                <td style="text-align: right;">${formatCurrency(item.total / 1.2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 40px;">
          <div>
            <div class="section-title">💳 Informations de Paiement</div>
            <div class="info-item">
              <div class="info-label">Méthode de paiement</div>
              <div class="info-value">${data.paymentInfo.paymentMethod}</div>
            </div>
            ${
              data.paymentInfo.bankDetails
                ? `
            <div class="info-item">
              <div class="info-label">Coordonnées bancaires</div>
              <div class="info-value">${data.paymentInfo.bankDetails}</div>
            </div>
            `
                : ""
            }
          </div>
          <div>
            <table class="table" style="margin: 0;">
              <tr>
                <td>Sous-total HT</td>
                <td style="text-align: right;">${formatCurrency(data.totals.subtotal)}</td>
              </tr>
              <tr>
                <td>TVA (20%)</td>
                <td style="text-align: right;">${formatCurrency(data.totals.vatAmount)}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px; background-color: #f8fafc;">
                <td>Total TTC</td>
                <td style="text-align: right;">${formatCurrency(data.totals.total)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-weight: 600;">Conditions de paiement :</p>
        <p style="margin: 5px 0 0 0;">
          Cette facture est payable sous 30 jours à compter de la date d'émission.
          En cas de retard de paiement, des pénalités de 3 fois le taux légal seront appliquées.
        </p>
      </div>
    `;

    return createDocumentTemplate(`Facture ${data.invoiceNumber}`, content);
  }

  private async createDeliveryCertificateHTML(data: any): Promise<string> {
    const content = `
      <div style="text-align: center; margin: 40px 0;">
        <div style="font-size: 32px; font-weight: bold; color: #059669; margin-bottom: 20px;">
          CERTIFICAT DE LIVRAISON
        </div>
        <div style="font-size: 18px; color: #64748b;">
          Nous certifions que la livraison suivante a été effectuée avec succès
        </div>
      </div>

      <div class="section">
        <div class="section-title">📦 Détails de la Livraison</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Numéro de livraison</div>
            <div class="info-value">${data.delivery.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Code de validation</div>
            <div class="info-value" style="font-weight: bold; color: #059669;">${data.validationCode}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date et heure de livraison</div>
            <div class="info-value">${formatDate(data.deliveredAt)} à ${data.deliveredAt.toLocaleTimeString("fr-FR")}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Statut</div>
            <div class="info-value" style="color: #059669; font-weight: bold;">LIVRÉ</div>
          </div>
        </div>
      </div>

      <div class="section">
                  <div class="section-title">DESCRIPTION</div>
        <div class="info-value" style="padding: 15px; background-color: #f8fafc; border-radius: 4px;">
          ${data.announcementTitle}
        </div>
      </div>

      <div class="section">
        <div class="section-title">📍 Trajet Effectué</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Point de départ</div>
            <div class="info-value">${data.pickupAddress}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Point d'arrivée</div>
            <div class="info-value">${data.deliveryAddress}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">👥 Participants</div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Client</div>
            <div class="info-value">${data.customerName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Livreur EcoDeli</div>
            <div class="info-value">${data.delivererName}</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <img src="${data.qrCodeDataURL}" alt="QR Code de vérification" style="width: 150px; height: 150px;" />
        <p style="margin: 15px 0; font-size: 14px; color: #64748b;">
          QR Code de vérification - Scannez pour authentifier ce certificat
        </p>
      </div>

      <div style="margin-top: 50px; padding: 25px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; text-align: center;">
        <div style="font-weight: bold; color: #0369a1; margin-bottom: 10px;">
          🌱 EcoDeli - Livraisons Écologiques Certifiées
        </div>
        <div style="font-size: 14px; color: #64748b;">
          Ce document certifie l'accomplissement de la mission de livraison conformément aux standards EcoDeli.
          <br>Pour toute vérification, contactez notre service client au contact@ecodeli.fr
        </div>
      </div>
    `;

    return createDocumentTemplate("Certificat de Livraison", content);
  }
}

export const pdfGeneratorService = new PDFGeneratorService();
