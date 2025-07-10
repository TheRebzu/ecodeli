import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

/**
 * CRON Job CRITIQUE: Facturation automatique mensuelle Merchant
 * 
 * Selon le cahier des charges Mission 1:
 * - Génération automatique mensuelle des factures commerçants
 * - Calcul des commissions selon contrat (taux variable par merchant)
 * - Génération PDF automatique
 * - Prélèvement automatique via Stripe
 * - Archive accessible (merchant + comptabilité EcoDeli)
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que la requête vient du système CRON
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'ecodeli-cron-2024';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid CRON secret' },
        { status: 401 }
      );
    }

    console.log('🚀 CRON Job démarré: Facturation mensuelle Merchant');
    
    // Période de facturation : mois précédent
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const billingPeriodStart = startOfMonth(lastMonth);
    const billingPeriodEnd = endOfMonth(lastMonth);

    console.log(`📅 Période de facturation: ${format(billingPeriodStart, 'dd/MM/yyyy')} - ${format(billingPeriodEnd, 'dd/MM/yyyy')}`);

    // Récupérer tous les commerçants actifs avec contrat valide
    const activeMerchants = await db.merchant.findMany({
      where: {
        contractStatus: 'ACTIVE',
        contract: {
          status: 'ACTIVE',
          validFrom: { lte: billingPeriodEnd },
          OR: [
            { validUntil: null },
            { validUntil: { gte: billingPeriodStart } }
          ]
        }
      },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        contract: true
      }
    });

    console.log(`📊 ${activeMerchants.length} commerçants actifs trouvés`);

    const results = {
      success: [],
      errors: [],
      totalMerchants: activeMerchants.length,
      totalInvoicesGenerated: 0,
      totalCommissionAmount: 0,
      totalMonthlyFees: 0
    };

    // Traiter chaque commerçant
    for (const merchant of activeMerchants) {
      try {
        console.log(`💼 Traitement commerçant: ${merchant.companyName}`);

        // Vérifier s'il y a déjà une facture pour cette période
        const existingBilling = await db.merchantBilling.findFirst({
          where: {
            merchantId: merchant.id,
            periodStart: billingPeriodStart,
            periodEnd: billingPeriodEnd
          }
        });

        if (existingBilling) {
          console.log(`⏭️  Facture déjà générée pour ${merchant.companyName}`);
          results.errors.push({
            merchantId: merchant.id,
            companyName: merchant.companyName,
            error: 'Facture déjà générée pour cette période'
          });
          continue;
        }

        // Récupérer les commandes et livraisons du mois
        const [orders, announcements] = await Promise.all([
          // Commandes cart-drop du merchant
          db.order.findMany({
            where: {
              merchantId: merchant.id,
              createdAt: {
                gte: billingPeriodStart,
                lte: billingPeriodEnd
              },
              status: {
                in: ['COMPLETED', 'DELIVERED']
              }
            },
            include: {
              payment: true
            }
          }),
          // Annonces du merchant avec livraisons complétées
          db.announcement.findMany({
            where: {
              merchantId: merchant.id,
              createdAt: {
                gte: billingPeriodStart,
                lte: billingPeriodEnd
              },
              deliveries: {
                some: {
                  status: 'DELIVERED',
                  actualDeliveryDate: {
                    gte: billingPeriodStart,
                    lte: billingPeriodEnd
                  }
                }
              }
            },
            include: {
              deliveries: {
                where: {
                  status: 'DELIVERED',
                  actualDeliveryDate: {
                    gte: billingPeriodStart,
                    lte: billingPeriodEnd
                  }
                },
                include: {
                  payment: true
                }
              }
            }
          })
        ]);

        // Calculer les montants
        const orderRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const deliveryRevenue = announcements.reduce((sum, announcement) => 
          sum + announcement.deliveries.reduce((deliverySum, delivery) => 
            deliverySum + (delivery.payment?.amount || delivery.finalPrice || announcement.finalPrice), 0
          ), 0
        );

        const totalRevenue = orderRevenue + deliveryRevenue;
        const totalOrders = orders.length + announcements.reduce((sum, ann) => sum + ann.deliveries.length, 0);

        // Si aucune activité, passer au merchant suivant (sauf si frais mensuel)
        if (totalOrders === 0 && (!merchant.contract?.monthlyFee || merchant.contract.monthlyFee === 0)) {
          console.log(`⏭️  Aucune activité pour ${merchant.companyName}`);
          continue;
        }

        // Calculer les commissions selon le contrat
        const commissionRate = merchant.contract?.commissionRate || merchant.commissionRate;
        let commissionAmount = totalRevenue * commissionRate;

        // Vérifier commission minimum
        if (merchant.contract?.minCommissionAmount && commissionAmount < merchant.contract.minCommissionAmount) {
          commissionAmount = merchant.contract.minCommissionAmount;
        }

        const monthlyFee = merchant.contract?.monthlyFee || 0;
        const totalAmount = commissionAmount + monthlyFee;

        // Créer la facture
        const invoiceNumber = `FACT-${merchant.id.slice(-6)}-${format(billingPeriodStart, 'yyyyMM')}`;
        
        const billing = await db.merchantBilling.create({
          data: {
            merchantId: merchant.id,
            contractId: merchant.contract?.id,
            periodStart: billingPeriodStart,
            periodEnd: billingPeriodEnd,
            totalOrders,
            totalRevenue,
            commissionAmount,
            monthlyFee,
            totalAmount,
            invoiceNumber,
            status: 'PENDING',
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 jours
          }
        });

        // Générer le PDF de la facture
        const invoicePath = await generateMerchantInvoicePDF(
          billing,
          merchant,
          { orders, announcements },
          format(billingPeriodStart, 'MMMM yyyy', { locale: fr })
        );

        // Mettre à jour le billing avec le chemin du PDF
        await db.merchantBilling.update({
          where: { id: billing.id },
          data: { invoicePath }
        });

        // Créer les paiements Stripe (simulation pour l'instant)
        // TODO: Intégrer réellement avec Stripe Connected Accounts
        if (totalAmount > 0) {
          await simulateStripePayment(merchant, billing);
        }

        console.log(`✅ Facture générée pour ${merchant.companyName}: ${invoiceNumber} - ${totalAmount}€`);

        results.success.push({
          merchantId: merchant.id,
          companyName: merchant.companyName,
          invoiceNumber,
          totalAmount,
          commissionAmount,
          monthlyFee,
          totalOrders,
          invoicePath
        });

        results.totalInvoicesGenerated++;
        results.totalCommissionAmount += commissionAmount;
        results.totalMonthlyFees += monthlyFee;

        // Notification au commerçant
        await db.notification.create({
          data: {
            userId: merchant.userId,
            type: 'BILLING',
            title: 'Nouvelle facture mensuelle',
            message: `Votre facture ${invoiceNumber} de ${totalAmount.toFixed(2)}€ est disponible`,
            priority: 'HIGH',
            metadata: {
              billingId: billing.id,
              invoiceNumber,
              amount: totalAmount,
              dueDate: billing.dueDate
            }
          }
        });

      } catch (error) {
        console.error(`❌ Erreur pour ${merchant.companyName}:`, error);
        results.errors.push({
          merchantId: merchant.id,
          companyName: merchant.companyName,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    // Créer un rapport d'exécution CRON
    const cronReport = await db.cronJobExecution.create({
      data: {
        jobName: 'merchant-monthly-billing',
        executedAt: now,
        status: results.errors.length === 0 ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        summary: {
          totalMerchants: results.totalMerchants,
          invoicesGenerated: results.totalInvoicesGenerated,
          totalCommissionAmount: results.totalCommissionAmount,
          totalMonthlyFees: results.totalMonthlyFees,
          totalAmount: results.totalCommissionAmount + results.totalMonthlyFees,
          successCount: results.success.length,
          errorCount: results.errors.length
        },
        details: results
      }
    });

    console.log('📋 Rapport CRON généré:', cronReport.id);

    // Notification aux administrateurs
    await db.notification.create({
      data: {
        userId: 'admin',
        type: 'SYSTEM',
        title: 'Facturation merchant terminée',
        message: `${results.totalInvoicesGenerated} factures générées pour un total de ${(results.totalCommissionAmount + results.totalMonthlyFees).toFixed(2)}€`,
        metadata: {
          cronReportId: cronReport.id,
          ...results.summary
        }
      }
    });

    console.log('🎉 CRON Job terminé avec succès');

    return NextResponse.json({
      success: true,
      message: 'Facturation mensuelle merchant terminée',
      data: {
        executionId: cronReport.id,
        ...results
      }
    });

  } catch (error) {
    console.error('💥 Erreur CRON Job facturation merchant:', error);
    
    // Créer un rapport d'erreur
    await db.cronJobExecution.create({
      data: {
        jobName: 'merchant-monthly-billing',
        executedAt: new Date(),
        status: 'FAILED',
        summary: {
          error: error instanceof Error ? error.message : 'Erreur fatale CRON'
        },
        details: { error: error instanceof Error ? error.stack : error }
      }
    });

    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la facturation automatique merchant',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Informations sur le CRON de facturation merchant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Informations sur le prochain CRON
    const nextExecution = new Date();
    nextExecution.setMonth(nextExecution.getMonth() + 1);
    nextExecution.setDate(1); // Premier du mois suivant
    nextExecution.setHours(2, 0, 0, 0); // 2h du matin

    // Historique des exécutions
    const recentExecutions = await db.cronJobExecution.findMany({
      where: {
        jobName: 'merchant-monthly-billing'
      },
      orderBy: {
        executedAt: 'desc'
      },
      take: 5
    });

    // Statistiques
    const currentMonth = new Date();
    const lastMonthBillings = await db.merchantBilling.findMany({
      where: {
        periodStart: {
          gte: startOfMonth(subMonths(currentMonth, 1)),
          lte: endOfMonth(subMonths(currentMonth, 1))
        }
      }
    });

    const stats = {
      lastMonthInvoices: lastMonthBillings.length,
      lastMonthRevenue: lastMonthBillings.reduce((sum, b) => sum + b.totalAmount, 0),
      pendingPayments: await db.merchantBilling.count({
        where: { status: 'PENDING' }
      }),
      overduePayments: await db.merchantBilling.count({
        where: { 
          status: 'PENDING',
          dueDate: { lt: new Date() }
        }
      })
    };

    return NextResponse.json({
      message: 'CRON Job Facturation Merchant',
      nextExecution: nextExecution.toISOString(),
      recentExecutions: recentExecutions.map(exec => ({
        id: exec.id,
        executedAt: exec.executedAt,
        status: exec.status,
        summary: exec.summary
      })),
      stats
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la consultation CRON' },
      { status: 500 }
    );
  }
}

/**
 * Générer le PDF de facture merchant
 */
async function generateMerchantInvoicePDF(
  billing: any,
  merchant: any,
  data: { orders: any[], announcements: any[] },
  monthName: string
): Promise<string> {
  try {
    const doc = new jsPDF();
    
    // En-tête EcoDeli
    doc.setFontSize(20);
    doc.text("EcoDeli", 20, 20);
    doc.setFontSize(12);
    doc.text("110 rue de Flandre, 75019 Paris", 20, 30);
    doc.text("SIRET: 12345678901234", 20, 35);
    
    // Titre facture
    doc.setFontSize(16);
    doc.text("FACTURE MENSUELLE COMMERÇANT", 20, 50);
    
    // Informations facture
    doc.setFontSize(10);
    doc.text(`Facture N°: ${billing.invoiceNumber}`, 20, 65);
    doc.text(`Période: ${monthName}`, 20, 70);
    doc.text(`Date d'émission: ${format(new Date(), "dd/MM/yyyy")}`, 20, 75);
    doc.text(`Date d'échéance: ${format(billing.dueDate, "dd/MM/yyyy")}`, 20, 80);
    
    // Informations commerçant
    doc.text("FACTURÉ À :", 120, 65);
    doc.text(`${merchant.companyName}`, 120, 70);
    doc.text(`SIRET: ${merchant.siret}`, 120, 75);
    if (merchant.vatNumber) {
      doc.text(`TVA: ${merchant.vatNumber}`, 120, 80);
    }
    
    // Détail des prestations
    let y = 100;
    doc.setFontSize(12);
    doc.text("DÉTAIL DES PRESTATIONS", 20, y);
    y += 10;
    
    // En-têtes tableau
    doc.setFontSize(8);
    doc.text("Description", 20, y);
    doc.text("Qté", 100, y);
    doc.text("CA HT", 120, y);
    doc.text("Commission", 150, y);
    doc.text("Montant HT", 180, y);
    y += 5;
    
    // Ligne de séparation
    doc.line(20, y, 200, y);
    y += 5;
    
    // Commandes cart-drop
    if (data.orders.length > 0) {
      const orderRevenue = data.orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const orderCommission = orderRevenue * billing.commissionAmount / billing.totalRevenue;
      
      doc.text(`Commandes Lâcher de Chariot`, 20, y);
      doc.text(`${data.orders.length}`, 100, y);
      doc.text(`${orderRevenue.toFixed(2)}€`, 120, y);
      doc.text(`${(billing.commissionAmount / billing.totalRevenue * 100).toFixed(1)}%`, 150, y);
      doc.text(`${orderCommission.toFixed(2)}€`, 180, y);
      y += 5;
    }
    
    // Livraisons annonces
    if (data.announcements.length > 0) {
      const deliveryRevenue = data.announcements.reduce((sum, ann) => 
        sum + ann.deliveries.reduce((dSum: number, delivery: any) => 
          dSum + (delivery.payment?.amount || delivery.finalPrice || ann.finalPrice), 0
        ), 0
      );
      const deliveryCount = data.announcements.reduce((sum, ann) => sum + ann.deliveries.length, 0);
      const deliveryCommission = deliveryRevenue * billing.commissionAmount / billing.totalRevenue;
      
      doc.text(`Annonces Livrées`, 20, y);
      doc.text(`${deliveryCount}`, 100, y);
      doc.text(`${deliveryRevenue.toFixed(2)}€`, 120, y);
      doc.text(`${(billing.commissionAmount / billing.totalRevenue * 100).toFixed(1)}%`, 150, y);
      doc.text(`${deliveryCommission.toFixed(2)}€`, 180, y);
      y += 5;
    }
    
    // Frais mensuels
    if (billing.monthlyFee > 0) {
      y += 5;
      doc.text(`Frais d'abonnement mensuel`, 20, y);
      doc.text(`1`, 100, y);
      doc.text(`-`, 120, y);
      doc.text(`-`, 150, y);
      doc.text(`${billing.monthlyFee.toFixed(2)}€`, 180, y);
      y += 5;
    }
    
    // Total
    y += 10;
    doc.line(20, y, 200, y);
    y += 5;
    doc.setFontSize(12);
    doc.text(`TOTAL HT: ${billing.totalAmount.toFixed(2)}€`, 140, y);
    y += 5;
    doc.text(`TVA (0%): 0,00€`, 140, y);
    y += 5;
    doc.setFontSize(14);
    doc.text(`TOTAL TTC: ${billing.totalAmount.toFixed(2)}€`, 140, y);
    
    // Conditions de paiement
    y += 15;
    doc.setFontSize(8);
    doc.text("CONDITIONS DE PAIEMENT:", 20, y);
    y += 5;
    doc.text("• Prélèvement automatique sous 5 jours ouvrés", 20, y);
    y += 3;
    doc.text("• Pénalités de retard: 3 fois le taux d'intérêt légal", 20, y);
    y += 3;
    doc.text("• Indemnité forfaitaire pour frais de recouvrement: 40€", 20, y);
    
    // Sauvegarder le PDF
    const pdfPath = `/invoices/merchants/${billing.invoiceNumber}.pdf`;
    // En production, sauvegarder sur un serveur/CDN
    // doc.save(pdfPath);
    
    return pdfPath;
    
  } catch (error) {
    console.error('Error generating merchant invoice PDF:', error);
    throw error;
  }
}

/**
 * Simuler le paiement Stripe pour le merchant
 */
async function simulateStripePayment(merchant: any, billing: any) {
  try {
    // TODO: Remplacer par vraie intégration Stripe Connected Accounts
    
    // Créer un enregistrement de paiement
    await db.payment.create({
      data: {
        userId: merchant.userId,
        merchantId: merchant.id,
        amount: billing.totalAmount,
        currency: 'EUR',
        paymentMethod: 'STRIPE_DIRECT_DEBIT',
        status: 'PENDING',
        metadata: {
          type: 'MERCHANT_BILLING',
          billingId: billing.id,
          invoiceNumber: billing.invoiceNumber,
          description: `Facturation mensuelle ${format(billing.periodStart, 'MMMM yyyy', { locale: fr })}`
        }
      }
    });
    
    console.log(`💳 Paiement simulé pour ${merchant.companyName}: ${billing.totalAmount}€`);
    
  } catch (error) {
    console.error('Error simulating Stripe payment:', error);
    throw error;
  }
} 