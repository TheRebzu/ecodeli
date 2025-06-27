import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'
import { generateBookingReference } from '../utils/generators/code-generator'

export async function seedBookings(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  const providers = ctx.data.get('providers') || []
  
  console.log('   Creating bookings...')
  
  const clients = users.filter((u: any) => u.role === CONSTANTS.roles.CLIENT)
  const activeProviders = providers.filter((p: any) => p.provider.isActive)
  
  const bookings = []
  
  // Créer des réservations pour chaque client
  for (const client of clients) {
    const numBookings = Math.floor(1 + Math.random() * 4) // 1 à 4 réservations par client
    
    for (let i = 0; i < numBookings; i++) {
      // Sélectionner un prestataire aléatoire
      const providerData = activeProviders[Math.floor(Math.random() * activeProviders.length)]
      if (!providerData || !providerData.services.length) continue
      
      const service = providerData.services[Math.floor(Math.random() * providerData.services.length)]
      
      // Déterminer la date de réservation
      const daysOffset = Math.floor(-30 + Math.random() * 60) // -30 à +30 jours
      const scheduledDate = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000)
      const hour = 8 + Math.floor(Math.random() * 10) // 8h à 18h
      scheduledDate.setHours(hour, 0, 0, 0)
      
      // Déterminer le statut basé sur la date
      let status = 'PENDING'
      if (daysOffset < -7) {
        status = Math.random() > 0.2 ? 'COMPLETED' : 'CANCELLED'
      } else if (daysOffset < 0) {
        status = Math.random() > 0.5 ? 'IN_PROGRESS' : 'CONFIRMED'
      } else {
        status = Math.random() > 0.3 ? 'CONFIRMED' : 'PENDING'
      }
      
      const booking = await prisma.booking.create({
        data: {
          clientId: client.id,
          providerId: providerData.provider.id,
          serviceId: service.id,
          status,
          reference: generateBookingReference(),
          scheduledDate,
          duration: service.duration || 120, // en minutes
          price: service.basePrice,
          address: client.address || '123 rue de la République, Paris',
          city: client.city || 'Paris',
          postalCode: client.postalCode || '75001',
          notes: Math.random() > 0.7 ? 'Merci de sonner deux fois' : null,
          clientPhone: client.phone,
          clientEmail: client.email,
          confirmedAt: status === 'CONFIRMED' || status === 'COMPLETED' ? new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000) : null,
          completedAt: status === 'COMPLETED' ? new Date(scheduledDate.getTime() + (service.duration || 120) * 60 * 1000) : null,
          cancelledAt: status === 'CANCELLED' ? new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000) : null,
          cancellationReason: status === 'CANCELLED' ? 'Client indisponible' : null
        }
      })
      
      bookings.push(booking)
      
      // Créer une intervention pour les réservations terminées
      if (status === 'COMPLETED') {
        const intervention = await prisma.intervention.create({
          data: {
            bookingId: booking.id,
            providerId: providerData.provider.id,
            startTime: scheduledDate,
            endTime: new Date(scheduledDate.getTime() + (service.duration || 120) * 60 * 1000),
            actualDuration: service.duration || 120,
            description: `${service.name} effectué`,
            clientSignature: true,
            photos: [`https://storage.ecodeli.fr/interventions/${booking.id}/photo1.jpg`],
            notes: 'Intervention réalisée avec succès',
            totalAmount: service.basePrice,
            status: 'COMPLETED'
          }
        })
        
        // Créer un avis pour certaines interventions complétées
        if (Math.random() > 0.3) {
          await prisma.review.create({
            data: {
              bookingId: booking.id,
              authorId: client.id,
              targetId: providerData.provider.userId,
              targetType: 'PROVIDER',
              rating: 3 + Math.floor(Math.random() * 3), // 3 à 5 étoiles
              comment: [
                'Excellent service, je recommande !',
                'Travail professionnel et ponctuel',
                'Très satisfait de la prestation',
                'Bon rapport qualité/prix',
                'Service correct mais peut mieux faire'
              ][Math.floor(Math.random() * 5)],
              isVerified: true
            }
          })
        }
      }
      
      // Créer des messages pour les réservations confirmées
      if (status === 'CONFIRMED' || status === 'IN_PROGRESS' || status === 'COMPLETED') {
        // Message de confirmation
        await prisma.bookingMessage.create({
          data: {
            bookingId: booking.id,
            senderId: providerData.provider.userId,
            message: 'Bonjour, je confirme votre réservation. À bientôt !',
            isFromProvider: true,
            sentAt: booking.confirmedAt || new Date()
          }
        })
        
        // Message du client
        if (Math.random() > 0.5) {
          await prisma.bookingMessage.create({
            data: {
              bookingId: booking.id,
              senderId: client.id,
              message: 'Merci pour la confirmation. Y a-t-il quelque chose de spécial à prévoir ?',
              isFromProvider: false,
              sentAt: new Date((booking.confirmedAt || new Date()).getTime() + 30 * 60 * 1000)
            }
          })
        }
      }
    }
  }
  
  console.log(`   ✓ Created ${bookings.length} bookings`)
  
  // Stocker pour les autres seeds
  ctx.data.set('bookings', bookings)
  
  return bookings
} 