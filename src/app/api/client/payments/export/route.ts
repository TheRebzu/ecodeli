import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Construire les filtres
    const where: any = {
      userId: user.id,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    // Construire les filtres metadata séparément
    const metadataFilters: any[] = [];

    if (type && type !== "all") {
      metadataFilters.push({
        path: ["type"],
        equals: type,
      });
    }

    if (search) {
      metadataFilters.push({
        path: ["description"],
        string_contains: search,
      });
    }

    if (metadataFilters.length === 1) {
      where.metadata = metadataFilters[0];
    } else if (metadataFilters.length > 1) {
      where.AND = metadataFilters.map((filter) => ({ metadata: filter }));
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // R�cup�rer tous les paiements correspondants
    const payments = await db.payment.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        delivery: {
          select: {
            id: true,
            announcement: {
              select: {
                title: true,
              },
            },
          },
        },
        booking: {
          select: {
            id: true,
            service: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      // G�n�rer CSV
      const csvHeader =
        "Date,Type,Description,Montant,Devise,Statut,Destinataire,Livraison\n";
      const csvData = payments
        .map((payment) => {
          const date = new Date(payment.createdAt).toLocaleDateString("fr-FR");
          const type = payment.metadata?.type || "UNKNOWN";
          const description = `"${(payment.metadata?.description || `Paiement ${payment.amount}€`).replace(/"/g, '""')}"`;
          const amount = payment.amount.toString();
          const currency = payment.currency;
          const status = payment.status;
          const userName = payment.user?.name || "";
          const delivery =
            payment.delivery?.announcement?.title ||
            payment.booking?.service?.name ||
            "";

          return `${date},${type},${description},${amount},${currency},${status},"${userName}","${delivery}"`;
        })
        .join("\n");

      const csv = csvHeader + csvData;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="paiements-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else if (format === "pdf") {
      // G�n�rer PDF simple (en pratique, utiliser une librairie comme jsPDF ou Puppeteer)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Historique des paiements</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .amount { text-align: right; }
            .status-completed { color: #28a745; }
            .status-pending { color: #ffc107; }
            .status-failed { color: #dc3545; }
            .status-refunded { color: #17a2b8; }
          </style>
        </head>
        <body>
          <h1>Historique des paiements EcoDeli</h1>
          <p>P�riode: ${dateFrom || "D�but"} - ${dateTo || "Aujourd'hui"}</p>
          <p>G�n�r� le: ${new Date().toLocaleDateString("fr-FR")}</p>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Destinataire</th>
              </tr>
            </thead>
            <tbody>
              ${payments
                .map(
                  (payment) => `
                <tr>
                  <td>${new Date(payment.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td>${payment.metadata?.type || "UNKNOWN"}</td>
                  <td>${payment.metadata?.description || `Paiement ${payment.amount}€`}</td>
                  <td class="amount">${payment.amount} ${payment.currency}</td>
                  <td class="status-${payment.status.toLowerCase()}">${payment.status}</td>
                  <td>${payment.user?.name || "-"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 30px;">
            <h3>R�sum�</h3>
            <p>Total des paiements: ${payments.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0)} EUR</p>
            <p>Nombre de transactions: ${payments.length}</p>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="paiements-${new Date().toISOString().split("T")[0]}.html"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Format not supported" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error exporting payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
