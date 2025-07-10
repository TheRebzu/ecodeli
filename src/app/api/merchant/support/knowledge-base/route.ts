import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/merchant/support/knowledge-base - Récupérer les articles de la base de connaissances
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: any = {
      // Articles publiés et destinés aux commerçants
      published: true,
      audience: {
        has: 'MERCHANT'
      }
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          content: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            has: search.toLowerCase()
          }
        }
      ]
    }

    const [articles, total] = await Promise.all([
      prisma.knowledgeBaseArticle.findMany({
        where,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          tags: true,
          views: true,
          helpful: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { helpful: 'desc' },
          { views: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.knowledgeBaseArticle.count({ where })
    ])

    return NextResponse.json({
      articles: articles.map(article => ({
        id: article.id,
        title: article.title,
        content: article.content.substring(0, 300) + '...', // Résumé pour la liste
        category: article.category,
        tags: article.tags,
        views: article.views,
        helpful: Math.round((article.helpful / Math.max(article.views, 1)) * 100), // Pourcentage d'utilité
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      categories: [
        'Configuration',
        'Lâcher de chariot',
        'Intégrations',
        'Paiements',
        'Facturation',
        'Marketing',
        'Analytics',
        'Support technique',
        'Bonnes pratiques'
      ]
    })

  } catch (error) {
    console.error('Erreur récupération base de connaissances:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST /api/merchant/support/knowledge-base - Marquer un article comme utile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est un commerçant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { articleId, helpful } = body

    if (!articleId || typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Vérifier que l'article existe
    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId }
    })

    if (!article) {
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      )
    }

    // Enregistrer le feedback
    await prisma.knowledgeBaseFeedback.upsert({
      where: {
        articleId_userId: {
          articleId: articleId,
          userId: session.user.id
        }
      },
      update: {
        helpful: helpful
      },
      create: {
        articleId: articleId,
        userId: session.user.id,
        helpful: helpful
      }
    })

    // Mettre à jour les statistiques de l'article
    const feedbacks = await prisma.knowledgeBaseFeedback.findMany({
      where: { articleId: articleId }
    })

    const helpfulCount = feedbacks.filter(f => f.helpful).length

    await prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: {
        helpful: helpfulCount,
        views: article.views + 1 // Incrémenter les vues aussi
      }
    })

    return NextResponse.json({
      success: true,
      helpful: helpfulCount,
      views: article.views + 1
    })

  } catch (error) {
    console.error('Erreur feedback article:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 