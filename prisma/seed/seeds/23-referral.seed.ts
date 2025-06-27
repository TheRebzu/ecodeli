import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

const referralRewards = {
  REFERRER: {
    SIGNUP: 5, // 5€ quand le filleul s'inscrit
    FIRST_ORDER: 10, // 10€ après première commande du filleul
    MILESTONE_10: 50, // 50€ bonus après 10 parrainages
    MILESTONE_25: 150 // 150€ bonus après 25 parrainages
  },
  REFEREE: {
    SIGNUP: 5, // 5€ de bienvenue
    FIRST_ORDER_DISCOUNT: 20 // 20% sur première commande
  }
}

function generateReferralCode(userId: string, index: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'ECO'
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function seedReferrals(ctx: SeedContext) {
  const { prisma } = ctx
  const users = ctx.data.get('users') || []
  
  console.log('   Creating referral system data...')
  
  const programs = []
  const referrals = []
  const rewards = []
  
  // Créer le programme de parrainage principal
  const mainProgram = await prisma.referralProgram.create({
    data: {
      name: 'Programme Parrainage EcoDeli',
      description: 'Parrainez vos amis et gagnez des récompenses !',
      isActive: true,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Depuis 1 an
      referrerReward: referralRewards.REFERRER.SIGNUP,
      refereeReward: referralRewards.REFEREE.SIGNUP,
      bonusReward: referralRewards.REFERRER.FIRST_ORDER,
      maxReferralsPerUser: 100,
      minOrderAmount: 20, // Commande minimum pour débloquer les récompenses
      rules: {
        referrerRewards: referralRewards.REFERRER,
        refereeRewards: referralRewards.REFEREE,
        conditions: [
          'Le filleul doit s\'inscrire avec votre code',
          'Le filleul doit effectuer sa première commande dans les 30 jours',
          'Les récompenses sont créditées après validation de la commande',
          'Maximum 100 parrainages par utilisateur'
        ]
      }
    }
  })
  programs.push(mainProgram)
  
  // Créer des codes de parrainage pour les utilisateurs actifs
  const activeUsers = users.filter((u: any) => 
    ['CLIENT', 'DELIVERER', 'PROVIDER'].includes(u.role)
  )
  
  for (const user of activeUsers) {
    const referralCode = await prisma.referralCode.create({
      data: {
        code: generateReferralCode(user.id, 0),
        userId: user.id,
        programId: mainProgram.id,
        isActive: true,
        usageCount: 0,
        maxUsage: 100,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Expire dans 1 an
      }
    })
    
    // Simuler des parrainages réussis pour certains utilisateurs
    if (Math.random() < 0.3) { // 30% ont parrainé
      const numReferrals = Math.floor(Math.random() * 10) + 1 // 1-10 parrainages
      
      for (let i = 0; i < numReferrals; i++) {
        // Créer un utilisateur fictif parrainé
        const referredUserIndex = users.findIndex((u: any) => 
          u.id !== user.id && 
          u.createdAt > user.createdAt &&
          u.role === 'CLIENT'
        )
        
        if (referredUserIndex === -1) continue
        
        const referredUser = users[referredUserIndex]
        const referralDate = new Date(
          Math.max(
            user.createdAt.getTime(),
            referredUser.createdAt.getTime() - 7 * 24 * 60 * 60 * 1000
          )
        )
        
        const referral = await prisma.referral.create({
          data: {
            referrerId: user.id,
            refereeId: referredUser.id,
            programId: mainProgram.id,
            referralCodeId: referralCode.id,
            status: Math.random() < 0.8 ? 'COMPLETED' : 'PENDING',
            referralDate,
            conversionDate: Math.random() < 0.8 
              ? new Date(referralDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
              : null,
            metadata: {
              source: Math.random() > 0.5 ? 'email' : 'social',
              device: Math.random() > 0.5 ? 'mobile' : 'desktop'
            }
          }
        })
        referrals.push(referral)
        
        // Mettre à jour le compteur d'utilisation
        await prisma.referralCode.update({
          where: { id: referralCode.id },
          data: { usageCount: { increment: 1 } }
        })
        
        // Créer les récompenses si conversion réussie
        if (referral.status === 'COMPLETED') {
          // Récompense pour le parrain
          const referrerReward = await prisma.referralReward.create({
            data: {
              referralId: referral.id,
              userId: user.id,
              type: 'REFERRER_BONUS',
              amount: referralRewards.REFERRER.SIGNUP,
              status: 'CREDITED',
              creditedAt: referral.conversionDate,
              description: `Parrainage de ${referredUser.profile?.firstName || 'un ami'}`,
              metadata: {
                refereeId: referredUser.id,
                programId: mainProgram.id
              }
            }
          })
          rewards.push(referrerReward)
          
          // Récompense pour le filleul
          const refereeReward = await prisma.referralReward.create({
            data: {
              referralId: referral.id,
              userId: referredUser.id,
              type: 'REFEREE_WELCOME',
              amount: referralRewards.REFEREE.SIGNUP,
              status: 'CREDITED',
              creditedAt: referral.conversionDate,
              description: 'Bonus de bienvenue parrainage',
              metadata: {
                referrerId: user.id,
                programId: mainProgram.id
              }
            }
          })
          rewards.push(refereeReward)
          
          // Bonus première commande (50% de chance)
          if (Math.random() < 0.5) {
            const firstOrderReward = await prisma.referralReward.create({
              data: {
                referralId: referral.id,
                userId: user.id,
                type: 'FIRST_ORDER_BONUS',
                amount: referralRewards.REFERRER.FIRST_ORDER,
                status: 'CREDITED',
                creditedAt: new Date(referral.conversionDate!.getTime() + 7 * 24 * 60 * 60 * 1000),
                description: 'Bonus première commande du filleul',
                metadata: {
                  refereeId: referredUser.id,
                  orderId: `ORDER-${Date.now()}`
                }
              }
            })
            rewards.push(firstOrderReward)
          }
        }
      }
      
      // Vérifier les jalons (milestones)
      const completedReferrals = referrals.filter((r: any) => 
        r.referrerId === user.id && r.status === 'COMPLETED'
      ).length
      
      if (completedReferrals >= 10 && completedReferrals < 25) {
        const milestone10Reward = await prisma.referralReward.create({
          data: {
            userId: user.id,
            type: 'MILESTONE_BONUS',
            amount: referralRewards.REFERRER.MILESTONE_10,
            status: 'CREDITED',
            creditedAt: new Date(),
            description: 'Bonus 10 parrainages réussis !',
            metadata: {
              milestone: 10,
              totalReferrals: completedReferrals
            }
          }
        })
        rewards.push(milestone10Reward)
      } else if (completedReferrals >= 25) {
        const milestone25Reward = await prisma.referralReward.create({
          data: {
            userId: user.id,
            type: 'MILESTONE_BONUS',
            amount: referralRewards.REFERRER.MILESTONE_25,
            status: 'CREDITED',
            creditedAt: new Date(),
            description: 'Bonus 25 parrainages réussis ! Vous êtes un super ambassadeur !',
            metadata: {
              milestone: 25,
              totalReferrals: completedReferrals
            }
          }
        })
        rewards.push(milestone25Reward)
      }
    }
  }
  
  // Créer des statistiques de parrainage
  const totalReferrals = referrals.length
  const successfulReferrals = referrals.filter((r: any) => r.status === 'COMPLETED').length
  const totalRewardsAmount = rewards.reduce((sum: number, r: any) => sum + r.amount, 0)
  
  await prisma.referralStats.create({
    data: {
      programId: mainProgram.id,
      period: 'ALL_TIME',
      totalReferrals,
      successfulReferrals,
      conversionRate: totalReferrals > 0 ? (successfulReferrals / totalReferrals) * 100 : 0,
      totalRewardsDistributed: totalRewardsAmount,
      averageRewardPerReferral: successfulReferrals > 0 ? totalRewardsAmount / successfulReferrals : 0,
      topReferrers: referrals
        .reduce((acc: any[], r: any) => {
          const existing = acc.find(a => a.userId === r.referrerId)
          if (existing) {
            existing.count++
          } else {
            acc.push({ userId: r.referrerId, count: 1 })
          }
          return acc
        }, [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(r => ({ userId: r.userId, referralCount: r.count }))
    }
  })
  
  console.log(`   ✓ Created ${programs.length} referral programs`)
  console.log(`   ✓ Created ${referrals.length} referrals`)
  console.log(`   ✓ Created ${rewards.length} referral rewards`)
  console.log(`   ✓ Conversion rate: ${totalReferrals > 0 ? Math.round((successfulReferrals / totalReferrals) * 100) : 0}%`)
  
  return { programs, referrals, rewards }
} 