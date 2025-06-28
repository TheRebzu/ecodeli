import { PrismaClient } from '@prisma/client'
import { SeedContext } from '../config/seed.config'
import { ROLES } from '../data/constants'

export async function seedCertifications(prisma: PrismaClient, context: SeedContext) {
  console.log('🏆 Seeding certifications data...')

  const providers = await prisma.user.findMany({
    where: { role: ROLES.PROVIDER },
    include: { profile: true }
  })

  // Types de certifications possibles
  const certificationTypes = [
    {
      name: 'Ménage et Entretien',
      code: 'CLEANING_CERT',
      description: 'Certification pour les services de ménage et entretien',
      issuingOrganization: 'Fédération Française des Services',
      validityPeriod: 2, // années
      requirements: ['Formation initiale 40h', 'Expérience 6 mois'],
      level: 'BASIC'
    },
    {
      name: 'Jardinage et Espaces Verts',
      code: 'GARDENING_CERT',
      description: 'Certification pour les services de jardinage',
      issuingOrganization: 'Chambre des Métiers',
      validityPeriod: 3,
      requirements: ['CAP Espaces Verts', 'Formation sécurité'],
      level: 'PROFESSIONAL'
    },
    {
      name: 'Bricolage et Petits Travaux',
      code: 'HANDYMAN_CERT',
      description: 'Certification pour les petits travaux de bricolage',
      issuingOrganization: 'Qualibat',
      validityPeriod: 5,
      requirements: ['Formation technique', 'Assurance décennale'],
      level: 'PROFESSIONAL'
    },
    {
      name: 'Garde d\'Animaux',
      code: 'PET_CARE_CERT',
      description: 'Certification pour la garde d\'animaux domestiques',
      issuingOrganization: 'Ordre des Vétérinaires',
      validityPeriod: 3,
      requirements: ['Formation comportement animal', 'Premiers secours'],
      level: 'SPECIALIZED'
    },
    {
      name: 'Services à Domicile',
      code: 'HOME_SERVICE_CERT',
      description: 'Certification générale services à domicile',
      issuingOrganization: 'FEPEM',
      validityPeriod: 2,
      requirements: ['Formation réglementaire', 'Casier judiciaire'],
      level: 'BASIC'
    },
    {
      name: 'Transport de Personnes',
      code: 'TRANSPORT_CERT',
      description: 'Certificat de capacité transport de personnes',
      issuingOrganization: 'Préfecture',
      validityPeriod: 5,
      requirements: ['Permis B + 3 ans', 'Formation PSC1'],
      level: 'PROFESSIONAL'
    }
  ]

  // Créer les types de certifications
  for (const certType of certificationTypes) {
    await prisma.certificationType.upsert({
      where: { code: certType.code },
      update: {},
      create: certType
    })
  }

  // Assigner des certifications aux prestataires
  for (const provider of providers) {
    if (!provider.profile) continue

    const index = providers.indexOf(provider)
    
    // Chaque prestataire a 1 à 3 certifications
    const certCount = Math.floor(Math.random() * 3) + 1
    const selectedCerts = certificationTypes
      .sort(() => 0.5 - Math.random())
      .slice(0, certCount)

    for (const certType of selectedCerts) {
      const issueDate = new Date(Date.now() - Math.random() * 2 * 365 * 24 * 60 * 60 * 1000)
      const expiryDate = new Date(issueDate.getTime() + certType.validityPeriod * 365 * 24 * 60 * 60 * 1000)
      
      await prisma.certification.upsert({
        where: {
          userId_typeId: {
            userId: provider.id,
            typeId: certType.code
          }
        },
        update: {},
        create: {
          userId: provider.id,
          typeId: certType.code,
          certificateNumber: `CERT-${certType.code}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          issueDate: issueDate,
          expiryDate: expiryDate,
          status: expiryDate > new Date() ? 'ACTIVE' : 'EXPIRED',
          grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
          score: Math.floor(Math.random() * 40) + 60, // Entre 60 et 100
          documentUrl: `https://certifications.ecodeli.fr/docs/${provider.id}/${certType.code}.pdf`,
          verificationCode: Math.random().toString(36).substr(2, 10).toUpperCase(),
          isVerified: Math.random() > 0.2, // 80% vérifiées
          verifiedAt: Math.random() > 0.2 ? new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
          notes: index % 3 === 0 ? 'Certification obtenue avec mention' : null
        }
      })
    }

    // Créer les renouvellements de certification
    if (index < 2) {
      const renewalCert = selectedCerts[0]
      await prisma.certificationRenewal.create({
        data: {
          userId: provider.id,
          typeId: renewalCert.code,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Dans 30 jours
          status: 'PENDING',
          reminder1Sent: false,
          reminder2Sent: false,
          finalNoticeSent: false,
          notes: 'Renouvellement automatique programmé'
        }
      })
    }

    context.logger?.log(`Created certifications for provider ${provider.email}`)
  }

  // Créer quelques organismes de formation
  const trainingOrganizations = [
    {
      name: 'Institut National des Services',
      code: 'INS',
      address: '123 Rue de la Formation, Paris',
      phone: '+33142345678',
      email: 'contact@ins-formation.fr',
      website: 'https://ins-formation.fr',
      isAccredited: true,
      accreditationNumber: 'ACC-2024-001',
      specialties: ['CLEANING', 'HOME_SERVICE'],
      certificationTypes: ['CLEANING_CERT', 'HOME_SERVICE_CERT']
    },
    {
      name: 'Centre de Formation Jardinage Pro',
      code: 'CFJP',
      address: '45 Avenue des Jardins, Lyon',
      phone: '+33478901234',
      email: 'info@jardinage-pro.fr',
      website: 'https://jardinage-pro.fr',
      isAccredited: true,
      accreditationNumber: 'ACC-2024-002',
      specialties: ['GARDENING', 'LANDSCAPING'],
      certificationTypes: ['GARDENING_CERT']
    }
  ]

  for (const org of trainingOrganizations) {
    await prisma.trainingOrganization.upsert({
      where: { code: org.code },
      update: {},
      create: org
    })
  }

  // Créer l'historique de formation pour quelques prestataires
  for (let i = 0; i < Math.min(3, providers.length); i++) {
    const provider = providers[i]
    const org = trainingOrganizations[i % trainingOrganizations.length]
    
    await prisma.trainingSession.create({
      data: {
        userId: provider.id,
        organizationId: org.code,
        title: `Formation ${org.specialties[0]}`,
        description: `Formation professionnelle en ${org.specialties[0]}`,
        startDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - Math.random() * 300 * 24 * 60 * 60 * 1000),
        duration: 40, // heures
        status: 'COMPLETED',
        finalGrade: ['A', 'B'][Math.floor(Math.random() * 2)],
        certificateIssued: true,
        cost: Math.floor(Math.random() * 1000) + 500,
        location: org.address
      }
    })
  }

  context.logger?.log(`✅ Certifications seeding completed - ${providers.length} providers processed`)
} 