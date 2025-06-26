const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestDocuments() {
  try {
    console.log('🔧 Création de documents de test pour la validation admin...')

    // Récupérer quelques utilisateurs de test
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['DELIVERER', 'PROVIDER', 'MERCHANT']
        }
      },
      take: 5
    })

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé. Créez d\'abord des utilisateurs de test.')
      return
    }

    const documentTypes = ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION', 'CONTRACT', 'OTHER']
    const statuses = ['PENDING', 'APPROVED', 'REJECTED']

    const documents = []

    for (const user of users) {
      // Créer 2-3 documents par utilisateur
      const numDocs = Math.floor(Math.random() * 3) + 2
      
      for (let i = 0; i < numDocs; i++) {
        const type = documentTypes[Math.floor(Math.random() * documentTypes.length)]
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const filename = `${type.toLowerCase()}_${user.email}_${Date.now()}.pdf`
        
        const document = await prisma.document.create({
          data: {
            userId: user.id,
            type: type,
            filename: filename,
            originalName: filename,
            mimeType: 'application/pdf',
            validationStatus: status,
            size: Math.floor(Math.random() * 1000000) + 50000, // 50KB à 1MB
            url: `/uploads/documents/${filename}`,
            rejectionReason: status === 'REJECTED' ? 'Document non conforme aux exigences' : null,
            validatedAt: status !== 'PENDING' ? new Date() : null,
            validatedBy: status !== 'PENDING' ? 'admin-test-id' : null
          }
        })
        
        documents.push(document)
        console.log(`✅ Document créé: ${document.filename} (${status})`)
      }
    }

    console.log(`\n🎉 ${documents.length} documents de test créés avec succès!`)
    console.log('📊 Répartition par statut:')
    
    const stats = await prisma.document.groupBy({
      by: ['validationStatus'],
      _count: {
        id: true
      }
    })
    
    stats.forEach(stat => {
      console.log(`   ${stat.validationStatus}: ${stat._count.id}`)
    })

  } catch (error) {
    console.error('❌ Erreur création documents:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestDocuments() 