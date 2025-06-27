import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

const documentTemplates = {
  DELIVERER: [
    { type: 'IDENTITY', name: 'Carte d\'identité', required: true },
    { type: 'DRIVING_LICENSE', name: 'Permis de conduire', required: true },
    { type: 'INSURANCE', name: 'Attestation d\'assurance', required: true },
    { type: 'OTHER', name: 'Carte grise', required: false },
    { type: 'OTHER', name: 'Casier judiciaire', required: false }
  ],
  PROVIDER: [
    { type: 'IDENTITY', name: 'Carte d\'identité', required: true },
    { type: 'CERTIFICATION', name: 'Diplôme/Certification', required: true },
    { type: 'INSURANCE', name: 'Assurance professionnelle', required: true },
    { type: 'OTHER', name: 'RIB', required: true },
    { type: 'OTHER', name: 'Extrait KBIS', required: false }
  ],
  MERCHANT: [
    { type: 'OTHER', name: 'Extrait KBIS', required: true },
    { type: 'OTHER', name: 'RIB professionnel', required: true },
    { type: 'CONTRACT', name: 'Contrat signé', required: true },
    { type: 'INSURANCE', name: 'Assurance commerce', required: false }
  ]
}

export async function seedDocuments(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Creating user documents...')
  
  const documents = []
  
  // Documents pour les livreurs
  const deliverers = users.filter(u => u.role === CONSTANTS.roles.DELIVERER)
  for (const deliverer of deliverers) {
    const profile = await prisma.profile.findUnique({ where: { userId: deliverer.id } })
    if (!profile) continue
    
    for (const docTemplate of documentTemplates.DELIVERER) {
      // Les livreurs validés ont tous leurs documents approuvés
      // Les en attente ont des documents pending
      // Les rejetés ont au moins un document rejeté
      let status = 'PENDING'
      if (deliverer.validationStatus === 'VALIDATED') {
        status = 'APPROVED'
      } else if (deliverer.validationStatus === 'REJECTED' && docTemplate.required && Math.random() > 0.5) {
        status = 'REJECTED'
      }
      
      const document = await prisma.document.create({
        data: {
          userId: deliverer.id,
          type: docTemplate.type,
          filename: `${docTemplate.type.toLowerCase()}_${deliverer.id}.pdf`,
          originalName: docTemplate.name,
          mimeType: 'application/pdf',
          size: 1024 * 100,
          url: `https://storage.ecodeli.fr/documents/${deliverer.id}/${docTemplate.type.toLowerCase()}.pdf`,
          validationStatus: status,
          validatedBy: status !== 'PENDING' ? 'admin1@test.com' : null,
          validatedAt: status !== 'PENDING' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          rejectionReason: status === 'REJECTED' ? 'Document illisible ou expiré' : null,
          expirationDate: docTemplate.type === 'DRIVING_LICENSE' || docTemplate.type === 'INSURANCE' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 an
            : null
        }
      })
      documents.push(document)
    }
  }
  
  // Documents pour les prestataires
  const providers = users.filter(u => u.role === CONSTANTS.roles.PROVIDER)
  for (const provider of providers) {
    const profile = await prisma.profile.findUnique({ where: { userId: provider.id } })
    if (!profile) continue
    
    for (const docTemplate of documentTemplates.PROVIDER) {
      const status = provider.validationStatus === 'VALIDATED' ? 'APPROVED' : 'PENDING'
      
      const document = await prisma.document.create({
        data: {
          userId: provider.id,
          type: docTemplate.type,
          filename: `${docTemplate.type.toLowerCase()}_${provider.id}.pdf`,
          originalName: docTemplate.name,
          mimeType: 'application/pdf',
          size: 1024 * 100,
          url: `https://storage.ecodeli.fr/documents/${provider.id}/${docTemplate.type.toLowerCase()}.pdf`,
          validationStatus: status,
          validatedBy: status === 'APPROVED' ? 'admin1@test.com' : null,
          validatedAt: status === 'APPROVED' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          expirationDate: docTemplate.type === 'DRIVING_LICENSE' || docTemplate.type === 'INSURANCE' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 an
            : null
        }
      })
      documents.push(document)
    }
  }
  
  // Documents pour les commerçants
  const merchants = users.filter(u => u.role === CONSTANTS.roles.MERCHANT)
  for (const merchant of merchants) {
    const profile = await prisma.profile.findUnique({ where: { userId: merchant.id } })
    if (!profile) continue
    
    for (const docTemplate of documentTemplates.MERCHANT) {
      const document = await prisma.document.create({
        data: {
          userId: merchant.id,
          type: docTemplate.type,
          filename: `${docTemplate.type.toLowerCase()}_${merchant.id}.pdf`,
          originalName: docTemplate.name,
          mimeType: 'application/pdf',
          size: 1024 * 100,
          url: `https://storage.ecodeli.fr/documents/${merchant.id}/${docTemplate.type.toLowerCase()}.pdf`,
          validationStatus: 'APPROVED', // Tous les commerçants sont validés
          validatedBy: 'admin1@test.com',
          validatedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          expirationDate: docTemplate.type === 'DRIVING_LICENSE' || docTemplate.type === 'INSURANCE' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 an
            : null
        }
      })
      documents.push(document)
    }
  }
  
  console.log(`   ✓ Created ${documents.length} documents`)
  
  return documents
} 