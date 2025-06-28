import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'
import { generateBookingReference } from '../utils/generators/code-generator'

export async function seedBookings(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  const providers = ctx.data.get('providers') || []
  
  console.log('   Creating bookings...')
  
  const clients = users.filter((u: any) => u.role === CONSTANTS.roles.CLIENT)
  console.log(`Number of clients: ${clients.length}`)
  const activeProviders = providers.filter((p: any) => p.provider.isActive)
  console.log(`Number of active providers: ${activeProviders.length}`)
  
  const bookings = []

  if (clients.length === 0) {
    console.log('No clients found. Skipping booking creation.')
    return bookings
  }

  if (activeProviders.length === 0) {
    console.log('No active providers found. Skipping booking creation.')
    return bookings
  }

  // Add logging for providerData.services.length
  for (const providerData of activeProviders) {
    if (!providerData.services || providerData.services.length === 0) {
      console.log(`Provider ${providerData.provider.id} has no services. Skipping bookings for this provider.`)
    }
  }
  
  // Créer des réservations pour chaque client
  for (const client of clients) {
    const numBookings = Math.floor(1 + Math.random() * 4) // 1 à 4 réservations par client
    
    for (let i = 0; i < numBookings; i++) {
      // Sélectionner un prestataire aléatoire
      const providerData = activeProviders[Math.floor(Math.random() * activeProviders.length)]
      if (!providerData || !providerData.services || providerData.services.length === 0) {
        console.log(`Provider ${providerData?.provider?.id} has no services or providerData is undefined. Skipping booking creation for this provider.`)
        continue
      }
      const service = providerData.services[Math.floor(Math.random() * providerData.services.length)]
      if (!service) {
        console.log(`Service is undefined for provider ${providerData.provider.id}. Skipping booking creation.`)
        continue
      }
      
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
      
      console.log(`Attempting to create booking with: clientId=${client.id}, providerId=${providerData.provider.id}, serviceId=${service.id}`)
      console.log(`Service object: ${JSON.stringify(service)}`)
      const booking = await prisma.booking.create({
        data: {
          clientId: client.id,
          providerId: providerData.provider.id,
          serviceId: service.id,
          status,
          scheduledDate,
          scheduledTime: scheduledDate.toTimeString().slice(0, 5),
          duration: service.duration || 120, // en minutes
          totalPrice: service.basePrice,
          address: { address: client.address || '123 rue de la République', city: client.city || 'Paris', postalCode: client.postalCode || '75001', lat: 0, lng: 0 },
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