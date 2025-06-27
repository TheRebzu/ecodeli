import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

const reviewTemplates = {
  DELIVERY: {
    5: [
      'Livraison parfaite ! Livreur très professionnel et ponctuel.',
      'Excellent service, colis livré en parfait état. Je recommande !',
      'Super livreur, communication au top et livraison rapide.',
      'Très satisfait, le livreur a pris soin de mon colis. Merci !',
      'Service impeccable du début à la fin. 5 étoiles méritées !'
    ],
    4: [
      'Bonne livraison, juste un petit retard mais bien communiqué.',
      'Livreur sympa et colis en bon état. Très bien.',
      'Service correct, rien à redire. Je referai appel à ce livreur.',
      'Livraison effectuée comme prévu, bon suivi.'
    ],
    3: [
      'Livraison correcte mais communication à améliorer.',
      'Le colis est arrivé mais avec du retard non prévenu.',
      'Service moyen, peut mieux faire sur la ponctualité.'
    ]
  },
  SERVICE: {
    5: [
      'Prestation excellente ! Travail soigné et professionnel.',
      'Je suis ravie du service, personne très compétente.',
      'Parfait ! Ponctuel, efficace et de bon conseil.',
      'Super prestataire, je recommande vivement !',
      'Qualité de service exceptionnelle, merci beaucoup !'
    ],
    4: [
      'Très bon service, juste quelques détails à améliorer.',
      'Prestataire sérieux et travail bien fait.',
      'Bonne prestation dans l\'ensemble, satisfait.',
      'Service de qualité, je referai appel à cette personne.'
    ],
    3: [
      'Service correct mais peut faire mieux.',
      'Prestation moyenne, quelques oublis.',
      'Le travail a été fait mais manque de finition.'
    ]
  },
  PROVIDER_RESPONSES: [
    'Merci beaucoup pour votre confiance et votre retour !',
    'Ravi que vous soyez satisfait de mes services.',
    'Merci pour votre commentaire, à bientôt j\'espère !',
    'C\'est un plaisir de travailler avec des clients comme vous.',
    'Merci pour cette évaluation, votre satisfaction est ma priorité.'
  ]
}

export async function seedReviews(ctx: SeedContext) {
  const { prisma } = ctx
  const deliveries = ctx.data.get('deliveries') || []
  const bookings = ctx.data.get('bookings') || []
  
  console.log('   Creating reviews...')
  
  const reviews = []
  
  // 1. Avis pour les livraisons terminées
  const completedDeliveries = deliveries.filter((d: any) => d.status === 'DELIVERED')
  
  for (const delivery of completedDeliveries) {
    // 80% de chance d'avoir un avis
    if (Math.random() > 0.2) {
      const deliverer = await prisma.deliverer.findUnique({
        where: { id: delivery.delivererId },
        include: { user: true }
      })
      
      if (!deliverer) continue
      
      // Distribution des notes : 60% 5 étoiles, 30% 4 étoiles, 10% 3 étoiles
      let rating = 5
      const rand = Math.random()
      if (rand < 0.1) rating = 3
      else if (rand < 0.4) rating = 4
      
      const comments = reviewTemplates.DELIVERY[rating as keyof typeof reviewTemplates.DELIVERY]
      const comment = comments[Math.floor(Math.random() * comments.length)]
      
      const review = await prisma.review.create({
        data: {
          deliveryId: delivery.id,
          authorId: delivery.announcement.userId,
          targetId: deliverer.userId,
          targetType: 'DELIVERER',
          rating,
          comment,
          isVerified: true, // Livraison confirmée donc avis vérifié
          createdAt: new Date(delivery.actualDeliveryAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000) // 0-3 jours après livraison
        }
      })
      
      reviews.push(review)
      
      // 30% de chance que le livreur réponde
      if (Math.random() < 0.3) {
        const response = await prisma.review.create({
          data: {
            deliveryId: delivery.id,
            authorId: deliverer.userId,
            targetId: delivery.announcement.userId,
            targetType: 'CLIENT',
            rating: 5, // Les livreurs mettent toujours 5 étoiles aux clients
            comment: reviewTemplates.PROVIDER_RESPONSES[Math.floor(Math.random() * reviewTemplates.PROVIDER_RESPONSES.length)],
            isResponse: true,
            parentReviewId: review.id,
            isVerified: true,
            createdAt: new Date(review.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000) // 0-24h après l'avis
          }
        })
        
        reviews.push(response)
      }
    }
  }
  
  // 2. Avis pour les services terminés
  const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED')
  
  for (const booking of completedBookings) {
    // 85% de chance d'avoir un avis pour les services
    if (Math.random() > 0.15) {
      const provider = await prisma.provider.findUnique({
        where: { id: booking.providerId },
        include: { user: true }
      })
      
      if (!provider) continue
      
      // Distribution des notes pour les services : 70% 5 étoiles, 25% 4 étoiles, 5% 3 étoiles
      let rating = 5
      const rand = Math.random()
      if (rand < 0.05) rating = 3
      else if (rand < 0.3) rating = 4
      
      const comments = reviewTemplates.SERVICE[rating as keyof typeof reviewTemplates.SERVICE]
      const comment = comments[Math.floor(Math.random() * comments.length)]
      
      const review = await prisma.review.create({
        data: {
          bookingId: booking.id,
          authorId: booking.clientId,
          targetId: provider.userId,
          targetType: 'PROVIDER',
          rating,
          comment,
          isVerified: true,
          serviceQuality: rating,
          punctuality: rating === 5 ? 5 : (rating === 4 ? Math.random() > 0.5 ? 4 : 5 : 3),
          communication: rating === 5 ? 5 : (rating === 4 ? 4 : Math.random() > 0.5 ? 3 : 4),
          wouldRecommend: rating >= 4,
          createdAt: new Date(booking.completedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) // 0-7 jours après service
        }
      })
      
      reviews.push(review)
      
      // 40% de chance que le prestataire réponde (plus actifs que les livreurs)
      if (Math.random() < 0.4) {
        const response = await prisma.review.create({
          data: {
            bookingId: booking.id,
            authorId: provider.userId,
            targetId: booking.clientId,
            targetType: 'CLIENT',
            rating: 5,
            comment: reviewTemplates.PROVIDER_RESPONSES[Math.floor(Math.random() * reviewTemplates.PROVIDER_RESPONSES.length)],
            isResponse: true,
            parentReviewId: review.id,
            isVerified: true,
            createdAt: new Date(review.createdAt.getTime() + Math.random() * 48 * 60 * 60 * 1000) // 0-48h après l'avis
          }
        })
        
        reviews.push(response)
      }
    }
  }
  
  // 3. Mettre à jour les moyennes des livreurs et prestataires
  const deliverers = await prisma.deliverer.findMany()
  for (const deliverer of deliverers) {
    const delivererReviews = await prisma.review.findMany({
      where: {
        targetId: deliverer.userId,
        targetType: 'DELIVERER',
        isResponse: false
      }
    })
    
    if (delivererReviews.length > 0) {
      const avgRating = delivererReviews.reduce((sum, r) => sum + r.rating, 0) / delivererReviews.length
      await prisma.deliverer.update({
        where: { id: deliverer.id },
        data: {
          averageRating: Math.round(avgRating * 10) / 10,
          totalDeliveries: delivererReviews.length
        }
      })
    }
  }
  
  const providers = await prisma.provider.findMany()
  for (const provider of providers) {
    const providerReviews = await prisma.review.findMany({
      where: {
        targetId: provider.userId,
        targetType: 'PROVIDER',
        isResponse: false
      }
    })
    
    if (providerReviews.length > 0) {
      const avgRating = providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length
      await prisma.provider.update({
        where: { id: provider.id },
        data: {
          averageRating: Math.round(avgRating * 10) / 10,
          totalBookings: providerReviews.length
        }
      })
    }
  }
  
  console.log(`   ✓ Created ${reviews.length} reviews`)
  
  return reviews
} 