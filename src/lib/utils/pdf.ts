import fs from 'fs/promises'
import path from 'path'

/**
 * Génère un PDF à partir de contenu HTML
 * Pour l'instant, on sauvegarde le HTML dans un fichier
 * En production, on utiliserait puppeteer ou jsPDF
 */
export async function generatePDF(htmlContent: string, fileName: string): Promise<string> {
  try {
    // Créer le dossier de stockage des PDFs s'il n'existe pas
    const pdfDir = path.join(process.cwd(), 'public', 'generated-pdfs')
    
    try {
      await fs.access(pdfDir)
    } catch {
      await fs.mkdir(pdfDir, { recursive: true })
    }

    // Pour l'instant, on sauvegarde le HTML avec extension .html
    // En production, on génèrerait un vrai PDF
    const htmlFileName = fileName.replace('.pdf', '.html')
    const filePath = path.join(pdfDir, htmlFileName)
    
    await fs.writeFile(filePath, htmlContent, 'utf-8')
    
    // Retourner l'URL publique
    return `/generated-pdfs/${htmlFileName}`

  } catch (error) {
    console.error('Erreur génération PDF:', error)
    throw new Error('Impossible de générer le PDF')
  }
}

/**
 * Génère un numéro de facture unique
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const timestamp = Date.now().toString().slice(-6)
  
  return `INV-${year}${month}-${timestamp}`
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Template HTML de base pour les documents
 */
export function createDocumentTemplate(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #f8fafc;
            color: #334155;
            line-height: 1.6;
          }
          .document {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 15px;
            border-left: 4px solid #2563eb;
            padding-left: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
            margin-bottom: 5px;
          }
          .info-value {
            color: #1e293b;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th,
          .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          .table th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          .signature-zone {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
          }
          .signature-box {
            text-align: center;
            padding: 20px;
            border: 1px dashed #cbd5e1;
            border-radius: 4px;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
            }
            .document {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
            <h1 class="title">${title}</h1>
          </div>
          ${content}
          <div class="footer">
            <p>Document généré automatiquement par EcoDeli le ${formatDate(new Date())}</p>
            <p>Pour toute question, contactez-nous à contact@ecodeli.fr</p>
          </div>
        </div>
      </body>
    </html>
  `
}