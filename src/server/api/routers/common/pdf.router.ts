import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Schémas de validation pour la génération PDF
const contractPdfSchema = z.object({ contractId: z.string(),
  templateType: z.enum(["merchant", "provider", "deliverer"]).optional() });

const invoicePdfSchema = z.object({ invoiceId: z.string(),
  includePaymentDetails: z.boolean().default(true) });

export const pdfRouter = router({ // Générer un PDF de contrat
  generateContract: protectedProcedure
    .input(contractPdfSchema)
    .mutation(async ({ input, ctx  }) => {
      try {
        const { contractId: contractId, templateType: templateType } = input;

        // Récupérer le contrat avec les informations nécessaires
        const contract = await ctx.db.contractTemplate.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    address: true}}}}}});

        if (!contract) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Contrat non trouvé" });
        }

        // Vérifier que l'utilisateur a le droit d'accéder à ce contrat
        if (
          contract.userId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à accéder à ce contrat" });
        }

        // Générer le contenu HTML du contrat
        const htmlContent = generateContractHTML(contract, templateType);

        // Générer le nom de fichier
        const timestamp = format(new Date(), "yyyy-MM-dd-HHmm", { locale });
        const filename = `contrat-${contract.title.replace(/\s+/g, "-")}-${timestamp}.pdf`;

        // En production, vous utiliseriez une librairie comme puppeteer ou jsPDF
        // Pour cette implémentation, nous retournons le HTML qui peut être converti en PDF côté client
        return {
          content: htmlContent,
          filename,
          mimeType: "text/html", // En attendant la conversion PDF
          contractInfo: {
            title: contract.title,
            createdAt: contract.createdAt,
            userName:
              contract.user.profile?.firstName +
              " " +
              contract.user.profile?.lastName}};
      } catch (error) {
        console.error("Erreur génération PDF contrat:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF de contrat" });
      }
    }),

  // Générer un PDF de facture
  generateInvoice: protectedProcedure
    .input(invoicePdfSchema)
    .mutation(async ({ input, ctx  }) => {
      try {
        const { invoiceId: invoiceId, includePaymentDetails: includePaymentDetails } = input;

        // Récupérer la facture avec tous les détails
        const invoice = await ctx.db.invoice.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    address: true}}}},
            invoiceItems: true,
            subscription: {
              select: {
                planType: true,
                currentPeriodStart: true,
                currentPeriodEnd: true}}}});

        if (!invoice) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Facture non trouvée" });
        }

        // Vérifier que l'utilisateur a le droit d'accéder à cette facture
        if (
          invoice.userId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à accéder à cette facture" });
        }

        // Générer le contenu HTML de la facture
        const htmlContent = generateInvoiceHTML(invoice, includePaymentDetails);

        // Générer le nom de fichier
        const timestamp = format(new Date(), "yyyy-MM-dd-HHmm", { locale });
        const filename = `facture-${invoice.number}-${timestamp}.pdf`;

        return {
          content: htmlContent,
          filename,
          mimeType: "text/html", // En attendant la conversion PDF
          invoiceInfo: {
            number: invoice.number,
            amount: invoice.amount,
            currency: invoice.currency,
            status: invoice.status,
            dueDate: invoice.dueDate}};
      } catch (error) {
        console.error("Erreur génération PDF facture:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF de facture" });
      }
    }),

  // Obtenir la liste des contrats disponibles pour génération PDF
  getAvailableContracts: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const contracts = await ctx.db.contractTemplate.findMany({
        where: {
          OR: [
            { userId: ctx.session.user.id },
            { isPublic },
            ...(ctx.session.user.role === "ADMIN" ? [{}] : [])]},
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          isPublic: true,
          userId: true},
        orderBy: {
          createdAt: "desc"}});

      return contracts;
    } catch (error) {
      console.error("Erreur récupération contrats:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des contrats" });
    }
  }),

  // Obtenir la liste des factures disponibles pour génération PDF
  getAvailableInvoices: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const invoices = await ctx.db.invoice.findMany({
        where:
          ctx.session.user.role === "ADMIN"
            ? {}
            : { userId: ctx.session.user.id },
        select: {
          id: true,
          number: true,
          amount: true,
          currency: true,
          status: true,
          issuedDate: true,
          dueDate: true,
          paidDate: true},
        orderBy: {
          issuedDate: "desc"}});

      return invoices;
    } catch (error) {
      console.error("Erreur récupération factures:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des factures" });
    }
  })});

// Fonction pour générer le HTML du contrat
function generateContractHTML(contract: any, templateType?: string): string {
  const today = format(new Date(), "dd MMMM yyyy", { locale });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrat - ${contract.title}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 2em;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .contract-info {
            background-color: #f8fafc;
            padding: 20px;
            border-left: 4px solid #2563eb;
            margin: 20px 0;
        }
        .parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
        }
        .party {
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        .party-title {
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .terms {
            margin: 30px 0;
        }
        .term {
            margin: 15px 0;
            padding-left: 20px;
        }
        .signature-section {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
        }
        .signature-box {
            border: 1px solid #e2e8f0;
            padding: 20px;
            text-align: center;
            min-height: 80px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">EcoDeli</div>
        <h1>Contrat de ${templateType || "Service"}</h1>
        <p>Document généré le ${today}</p>
    </div>

    <div class="contract-info">
        <h2>${contract.title}</h2>
        <p><strong>Référence:</strong> ${contract.id}</p>
        <p><strong>Date de création:</strong> ${format(new Date(contract.createdAt), "dd MMMM yyyy", { locale })}</p>
        ${contract.description ? `<p><strong>Description:</strong> ${contract.description}</p>` : ""}
    </div>

    <div class="parties">
        <div class="party">
            <div class="party-title">EcoDeli Platform</div>
            <p>Adresse: 123 Rue de la Tech<br>
            75001 Paris, France<br>
            Email: contact@ecodeli.me<br>
            SIRET: 123 456 789 00001</p>
        </div>
        <div class="party">
            <div class="party-title">Contractant</div>
            <p><strong>Nom:</strong> ${contract.user.profile?.firstName || ""} ${contract.user.profile?.lastName || ""}<br>
            <strong>Email:</strong> ${contract.user.email}<br>
            ${contract.user.profile?.phone ? `<strong>Téléphone:</strong> ${contract.user.profile.phone}<br>` : ""}
            ${contract.user.profile?.address ? `<strong>Adresse:</strong> ${contract.user.profile.address}` : ""}</p>
        </div>
    </div>

    <div class="terms">
        <h3>Termes et Conditions</h3>
        <div class="term">
            <strong>Article 1 - Objet du contrat</strong><br>
            Le présent contrat définit les conditions d'utilisation de la plateforme EcoDeli pour les services de ${templateType || "livraison collaborative"}.
        </div>
        <div class="term">
            <strong>Article 2 - Obligations du contractant</strong><br>
            Le contractant s'engage à respecter les conditions générales d'utilisation de la plateforme et à fournir des services de qualité conformément aux standards EcoDeli.
        </div>
        <div class="term">
            <strong>Article 3 - Rémunération</strong><br>
            Les modalités de rémunération sont définies selon la grille tarifaire en vigueur au moment de la prestation.
        </div>
        <div class="term">
            <strong>Article 4 - Durée</strong><br>
            Le présent contrat est conclu pour une durée indéterminée à compter de sa signature, avec possibilité de résiliation selon les conditions prévues dans les CGU.
        </div>
        <div class="term">
            <strong>Article 5 - Résiliation</strong><br>
            Chaque partie peut résilier le contrat avec un préavis de 30 jours, sous réserve du respect des obligations en cours.
        </div>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <strong>Pour EcoDeli</strong><br><br>
            <div style="border-top: 1px solid #ccc; margin-top: 40px; padding-top: 5px;">
                Signature et cachet
            </div>
        </div>
        <div class="signature-box">
            <strong>Le Contractant</strong><br><br>
            <div style="border-top: 1px solid #ccc; margin-top: 40px; padding-top: 5px;">
                Signature
            </div>
        </div>
    </div>
</body>
</html>`;
}

// Fonction pour générer le HTML de la facture
function generateInvoiceHTML(
  invoice: any,
  includePaymentDetails: boolean,
): string {
  const today = format(new Date(), "dd MMMM yyyy", { locale });

  // Calculer les totaux
  const subtotal = 0;
  const totalTax = 0;
  const total = 0;

  invoice.invoiceItems.forEach((item: any) => {
    subtotal += Number(item.unitPrice) * item.quantity;
    totalTax += Number(item.taxAmount);
    total += Number(item.totalAmount);
  });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture ${invoice.number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
        }
        .logo-section {
            text-align: left;
        }
        .logo {
            font-size: 2em;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-number {
            font-size: 1.5em;
            font-weight: bold;
            color: #2563eb;
        }
        .billing-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 30px 0;
        }
        .billing-section {
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
        }
        .section-title {
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        .items-table th {
            background-color: #f8fafc;
            font-weight: bold;
            color: #2563eb;
        }
        .totals {
            margin-left: auto;
            width: 300px;
            margin-top: 20px;
        }
        .total-row {
            display: grid;
            grid-template-columns: 1fr auto;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .final-total {
            background-color: #2563eb;
            color: white;
            padding: 10px;
            font-weight: bold;
            font-size: 1.1em;
        }
        .payment-info {
            background-color: #f8fafc;
            padding: 20px;
            border-left: 4px solid #10b981;
            margin: 30px 0;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .status-paid { background-color: #dcfce7; color: #166534; }
        .status-pending { background-color: #fef3c7; color: #92400e; }
        .status-overdue { background-color: #fee2e2; color: #991b1b; }
        @media print {
            body { margin: 0; padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-section">
            <div class="logo">EcoDeli</div>
            <p>123 Rue de la Tech<br>
            75001 Paris, France<br>
            Email: facturation@ecodeli.me<br>
            SIRET: 123 456 789 00001</p>
        </div>
        <div class="invoice-info">
            <div class="invoice-number">FACTURE</div>
            <div class="invoice-number">${invoice.number}</div>
            <p><strong>Date d'émission:</strong> ${format(new Date(invoice.issuedDate), "dd/MM/yyyy")}<br>
            <strong>Date d'échéance:</strong> ${format(new Date(invoice.dueDate), "dd/MM/yyyy")}<br>
            ${invoice.paidDate ? `<strong>Date de paiement:</strong> ${format(new Date(invoice.paidDate), "dd/MM/yyyy")}<br>` : ""}</p>
            <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
        </div>
    </div>

    <div class="billing-info">
        <div class="billing-section">
            <div class="section-title">Émetteur</div>
            <p><strong>EcoDeli Platform</strong><br>
            123 Rue de la Tech<br>
            75001 Paris, France<br>
            TVA: FR12345678901</p>
        </div>
        <div class="billing-section">
            <div class="section-title">Destinataire</div>
            <p><strong>${invoice.user.profile?.firstName || ""} ${invoice.user.profile?.lastName || ""}</strong><br>
            ${invoice.user.email}<br>
            ${invoice.user.profile?.phone ? `${invoice.user.profile.phone}<br>` : ""}
            ${invoice.user.profile?.address || "Adresse non renseignée"}</p>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantité</th>
                <th>Prix unitaire HT</th>
                <th>TVA</th>
                <th>Total TTC</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.invoiceItems
              .map(
                (item: any) => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${Number(item.unitPrice).toFixed(2)} ${invoice.currency}</td>
                    <td>${Number(item.taxRate).toFixed(0)}%</td>
                    <td>${Number(item.totalAmount).toFixed(2)} ${invoice.currency}</td>
                </tr>
            `,
              )
              .join("")}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-row">
            <span>Sous-total HT:</span>
            <span>${subtotal.toFixed(2)} ${invoice.currency}</span>
        </div>
        <div class="total-row">
            <span>TVA:</span>
            <span>${totalTax.toFixed(2)} ${invoice.currency}</span>
        </div>
        <div class="total-row final-total">
            <span>Total TTC:</span>
            <span>${total.toFixed(2)} ${invoice.currency}</span>
        </div>
    </div>

    ${
      includePaymentDetails
        ? `
    <div class="payment-info">
        <h3 style="margin-top: 0;">Informations de paiement</h3>
        <p><strong>Statut:</strong> ${invoice.status}<br>
        ${invoice.paidDate ? `<strong>Payée le:</strong> ${format(new Date(invoice.paidDate), "dd MMMM yyyy", { locale })}<br>` : ""}
        ${invoice.subscription ? `<strong>Abonnement:</strong> ${invoice.subscription.planType}<br>` : ""}
        <strong>Conditions de paiement:</strong> Paiement à réception<br>
        <strong>Pénalités de retard:</strong> 3 fois le taux d'intérêt légal</p>
    </div>
    `
        : ""
    }

    <div style="margin-top: 50px; text-align: center; font-size: 0.9em; color: #666;">
        <p>Document généré automatiquement le ${today}</p>
        <p>EcoDeli - Plateforme de livraison collaborative et services écologiques</p>
    </div>
</body>
</html>`;
}
