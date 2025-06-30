    // Construire la clause WHERE
    const where: any = {
      delivererId: user.id
    }

    if (params.status) {
      where.status = params.status
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {}
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom)
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo)
    }

    console.log('🔍 Clause WHERE pour la requête:', JSON.stringify(where, null, 2))

    // Récupérer les livraisons
    const deliveries = await db.delivery.findMany({
      where,
      include: {
        announcement: {
          include: {
            author: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    phone: true
                  }
                }
              }
            },
            PackageAnnouncement: {
              select: {
                weight: true,
                length: true,
                width: true,
                height: true,
                fragile: true,
                insuredValue: true
              }
            }
          }
        },
        payment: {
          select: {
            amount: true,
            status: true,
            paidAt: true
          }
        },
        ProofOfDelivery: {
          select: {
            id: true,
            recipientName: true,
            validatedWithCode: true,
            createdAt: true
          }
        },
        tracking: {
          orderBy: { timestamp: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            message: true,
            location: true,
            timestamp: true
          }
        }
      },
      orderBy: params.sortBy === 'createdAt' ? { createdAt: params.sortOrder } :
               params.sortBy === 'pickupDate' ? { pickupDate: params.sortOrder } :
               { deliveryDate: params.sortOrder },
      skip: (params.page - 1) * params.limit,
      take: params.limit
    })

    console.log('📦 Livraisons trouvées:', deliveries.length)
    if (deliveries.length > 0) {
      console.log('📋 Première livraison:', {
        id: deliveries[0].id,
        status: deliveries[0].status,
        delivererId: deliveries[0].delivererId,
        announcementId: deliveries[0].announcementId
      })
    } 