// Page de facture client EcoDeli
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; paymentId: string }>;
}) {
  // Await params first
  const { locale, paymentId } = await params;

  // Sécurité : authentification et rôle
  const session = await auth();
  if (!session || session.user.role !== "CLIENT") {
    notFound();
  }

  // Récupérer la facture réelle
  const invoice = await prisma.invoice.findUnique({
    where: { id: paymentId },
    include: {
      items: true,
    },
  });
  if (!invoice || (invoice as any).client?.userId !== session.user.id) {
    notFound();
  }

  // Traductions (stub)
  // @ts-ignore
  const t = (key: string) => key;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">
        {t("Facture")} #{invoice.invoiceNumber}
      </h1>
      <div className="mb-2">
        {t("Date")}: {new Date(invoice.createdAt).toLocaleDateString(locale)}
      </div>
      <div className="mb-2">
        {t("Montant total")}: {invoice.total} {invoice.currency}
      </div>
      <div className="mb-2">
        {t("Statut")}: {invoice.status}
      </div>
      <div className="mb-2">
        {t("Client")}: {(invoice as any).client?.profile?.firstName}{" "}
        {(invoice as any).client?.profile?.lastName}
      </div>
      <div className="mb-2">
        {t("Télécharger le PDF")} :
        {invoice.pdfUrl ? (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noopener"
            className="text-blue-600 underline ml-2"
          >
            {t("Télécharger")}
          </a>
        ) : (
          <span className="text-gray-500 ml-2">{t("PDF non disponible")}</span>
        )}
      </div>
      <Link
        href={`/${locale}/dashboard`}
        className="mt-4 inline-block text-sm text-blue-700 underline"
      >
        {t("Retour au tableau de bord")}
      </Link>
    </div>
  );
}
