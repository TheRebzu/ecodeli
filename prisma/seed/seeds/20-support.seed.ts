import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'
import { generateTicketNumber } from '../utils/generators/code-generator'

const supportCategories = {
  DELIVERY_ISSUE: {
    name: 'Problème de livraison',
    subcategories: ['Colis non reçu', 'Colis endommagé', 'Retard de livraison', 'Mauvaise adresse']
  },
  PAYMENT_ISSUE: {
    name: 'Problème de paiement',
    subcategories: ['Paiement refusé', 'Remboursement', 'Facturation incorrecte', 'Abonnement']
  },
  ACCOUNT_ISSUE: {
    name: 'Problème de compte',
    subcategories: ['Connexion impossible', 'Validation documents', 'Modification profil', 'Suppression compte']
  },
  SERVICE_ISSUE: {
    name: 'Problème de service',
    subcategories: ['Prestataire absent', 'Service insatisfaisant', 'Annulation', 'Modification réservation']
  },
  TECHNICAL_ISSUE: {
    name: 'Problème technique',
    subcategories: ['Bug application', 'Erreur affichage', 'Notification manquante', 'Autre']
  }
}

const ticketMessages = {
  CLIENT: [
    'Bonjour, je n\'ai pas reçu mon colis alors qu\'il est marqué comme livré.',
    'Le livreur n\'a pas respecté les instructions de livraison.',
    'Mon paiement a été débité deux fois pour la même commande.',
    'Je n\'arrive pas à me connecter à mon compte depuis ce matin.',
    'Le prestataire n\'est pas venu au rendez-vous prévu.'
  ],
  SUPPORT: [
    'Bonjour, nous sommes désolés pour ce désagrément. Pouvez-vous nous fournir plus de détails ?',
    'Nous avons bien pris en compte votre demande et allons vérifier avec le livreur.',
    'Je vais transférer votre demande au service comptabilité pour vérification.',
    'Avez-vous essayé de réinitialiser votre mot de passe ?',
    'Nous allons contacter le prestataire immédiatement pour comprendre ce qui s\'est passé.'
  ],
  RESOLUTION: [
    'Nous avons résolu le problème. Un geste commercial de 10€ a été crédité sur votre compte.',
    'Le livreur nous a confirmé la livraison. Nous vous remboursons intégralement.',
    'Le double paiement a été annulé, vous serez remboursé sous 3-5 jours.',
    'Votre compte a été débloqué. Vous pouvez maintenant vous connecter.',
    'Le prestataire a été sanctionné et nous vous proposons un nouveau créneau gratuit.'
  ]
}

export async function seedSupport(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Creating support tickets...')
  
  const tickets = []
  const messages = []
  
  // Créer 20-30 tickets de support
  const numTickets = 20 + Math.floor(Math.random() * 10)
  const clients = users.filter((u: any) => u.role === 'CLIENT')
  const admins = users.filter((u: any) => u.role === 'ADMIN')
  const supportAdmin = admins.find((a: any) => a.name.includes('Support')) || admins[0]
  
  for (let i = 0; i < numTickets; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)]
    const category = Object.keys(supportCategories)[Math.floor(Math.random() * Object.keys(supportCategories).length)]
    const categoryData = supportCategories[category as keyof typeof supportCategories]
    const subcategory = categoryData.subcategories[Math.floor(Math.random() * categoryData.subcategories.length)]
    
    // Déterminer le statut et les dates
    const createdDaysAgo = Math.floor(Math.random() * 30)
    const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000)
    
    let status = 'OPEN'
    let priority = 'MEDIUM'
    let resolvedAt = null
    let closedAt = null
    let assignedToId = null
    
    // 70% des tickets sont résolus ou fermés
    if (Math.random() < 0.7) {
      status = Math.random() < 0.8 ? 'RESOLVED' : 'CLOSED'
      resolvedAt = new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
      if (status === 'CLOSED') {
        closedAt = new Date(resolvedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000)
      }
      assignedToId = supportAdmin.id
    } else if (Math.random() < 0.5) {
      status = 'IN_PROGRESS'
      assignedToId = supportAdmin.id
    }
    
    // Priorité selon la catégorie
    if (category === 'PAYMENT_ISSUE' || category === 'DELIVERY_ISSUE') {
      priority = Math.random() < 0.3 ? 'HIGH' : 'MEDIUM'
    } else if (category === 'TECHNICAL_ISSUE') {
      priority = Math.random() < 0.7 ? 'LOW' : 'MEDIUM'
    }
    
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: generateTicketNumber(),
        userId: client.id,
        category: categoryData.name,
        subcategory,
        subject: `${subcategory} - ${client.name}`,
        description: ticketMessages.CLIENT[Math.floor(Math.random() * ticketMessages.CLIENT.length)],
        status,
        priority,
        assignedToId,
        resolvedAt,
        closedAt,
        createdAt,
        satisfaction: status === 'CLOSED' ? Math.floor(3 + Math.random() * 3) : null,
        metadata: {
          source: 'WEB',
          browser: 'Chrome',
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`
        }
      }
    })
    tickets.push(ticket)
    
    // Créer la conversation
    const numMessages = status === 'OPEN' ? 1 : Math.floor(2 + Math.random() * 5)
    
    for (let j = 0; j < numMessages; j++) {
      const isFromSupport = j > 0 && j % 2 === 1
      const senderId = isFromSupport ? supportAdmin.id : client.id
      const messageContent = isFromSupport 
        ? (j === numMessages - 1 && status === 'RESOLVED' 
          ? ticketMessages.RESOLUTION[Math.floor(Math.random() * ticketMessages.RESOLUTION.length)]
          : ticketMessages.SUPPORT[Math.floor(Math.random() * ticketMessages.SUPPORT.length)])
        : ticketMessages.CLIENT[Math.floor(Math.random() * ticketMessages.CLIENT.length)]
      
      const messageSentAt = new Date(createdAt.getTime() + j * 2 * 60 * 60 * 1000) // 2h entre chaque message
      
      const message = await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId,
          message: messageContent,
          isInternal: false,
          attachments: Math.random() > 0.8 ? [`screenshot_${j}.png`] : [],
          createdAt: messageSentAt,
          readAt: isFromSupport || status !== 'OPEN' ? new Date(messageSentAt.getTime() + 30 * 60 * 1000) : null
        }
      })
      messages.push(message)
    }
    
    // Ajouter une note interne pour les tickets résolus
    if (status === 'RESOLVED' || status === 'CLOSED') {
      const internalNote = await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: supportAdmin.id,
          message: 'Problème résolu. Client satisfait de la solution proposée.',
          isInternal: true,
          createdAt: resolvedAt!
        }
      })
      messages.push(internalNote)
    }
    
    // Créer un log d'activité
    await prisma.supportActivity.create({
      data: {
        ticketId: ticket.id,
        action: 'TICKET_CREATED',
        performedById: client.id,
        description: 'Ticket créé',
        createdAt
      }
    })
    
    if (assignedToId) {
      await prisma.supportActivity.create({
        data: {
          ticketId: ticket.id,
          action: 'TICKET_ASSIGNED',
          performedById: supportAdmin.id,
          description: `Ticket assigné à ${supportAdmin.name}`,
          createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000)
        }
      })
    }
    
    if (status === 'RESOLVED' || status === 'CLOSED') {
      await prisma.supportActivity.create({
        data: {
          ticketId: ticket.id,
          action: 'TICKET_RESOLVED',
          performedById: supportAdmin.id,
          description: 'Ticket résolu',
          createdAt: resolvedAt!
        }
      })
    }
  }
  
  // Créer quelques templates de réponse pour l'équipe support
  const responseTemplates = [
    {
      name: 'Problème de livraison',
      category: 'DELIVERY_ISSUE',
      content: 'Bonjour,\n\nNous sommes désolés d\'apprendre que vous rencontrez un problème avec votre livraison. Nous allons immédiatement vérifier avec notre livreur et revenir vers vous dans les plus brefs délais.\n\nCordialement,\nL\'équipe Support EcoDeli'
    },
    {
      name: 'Remboursement',
      category: 'PAYMENT_ISSUE',
      content: 'Bonjour,\n\nNous avons bien pris en compte votre demande de remboursement. Le montant sera crédité sur votre compte bancaire dans un délai de 3 à 5 jours ouvrés.\n\nCordialement,\nL\'équipe Support EcoDeli'
    },
    {
      name: 'Validation documents',
      category: 'ACCOUNT_ISSUE',
      content: 'Bonjour,\n\nNos équipes sont en train de vérifier vos documents. Ce processus peut prendre jusqu\'à 48h. Vous recevrez une notification dès que votre compte sera validé.\n\nCordialement,\nL\'équipe Support EcoDeli'
    }
  ]
  
  for (const template of responseTemplates) {
    await prisma.supportTemplate.create({
      data: {
        name: template.name,
        category: template.category,
        content: template.content,
        tags: [template.category.toLowerCase(), 'fréquent'],
        isActive: true,
        usageCount: Math.floor(Math.random() * 50)
      }
    })
  }
  
  console.log(`   ✓ Created ${tickets.length} support tickets`)
  console.log(`   ✓ Created ${messages.length} support messages`)
  console.log(`   ✓ Created ${responseTemplates.length} response templates`)
  
  return { tickets, messages }
} 