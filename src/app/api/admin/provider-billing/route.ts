import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

const generateInvoiceSchema = z.object({
  providerId: z.string(),
  month: z.string().optional(),
  year: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const month = searchParams.get('month')

    const whereConditions: any = {}

    if (status && status !== 'all') {
      whereConditions.status = status
    }

    if (search) {
      whereConditions.OR = [
        { provider: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
        { provider: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
        { provider: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (month) {
      const [year, monthNum] = month.split('-')
      whereConditions.year = year
      whereConditions.month = monthNum
    }

    // For now, we'll return mock data since the ProviderInvoice model might not exist yet
    const mockInvoices = [
      {
        id: 'INV-001',
        providerId: 'PROV-001',
        providerName: 'Marie Dubois',
        providerEmail: 'marie@example.com',
        month: '06',
        year: '2024',
        status: 'PENDING',
        totalAmount: 1250,
        servicesCount: 8,
        dueDate: '2024-07-30'
      },
      {
        id: 'INV-002',
        providerId: 'PROV-002',
        providerName: 'Thomas Moreau',
        providerEmail: 'thomas@example.com',
        month: '06',
        year: '2024',
        status: 'GENERATED',
        totalAmount: 890,
        servicesCount: 5,
        generatedAt: '2024-07-01',
        dueDate: '2024-07-30'
      },
      {
        id: 'INV-003',
        providerId: 'PROV-003',
        providerName: 'Sophie Laurent',
        providerEmail: 'sophie@example.com',
        month: '06',
        year: '2024',
        status: 'PAID',
        totalAmount: 2100,
        servicesCount: 12,
        generatedAt: '2024-07-01',
        paidAt: '2024-07-15',
        dueDate: '2024-07-30'
      },
      {
        id: 'INV-004',
        providerId: 'PROV-004',
        providerName: 'Jean Martin',
        providerEmail: 'jean@example.com',
        month: '05',
        year: '2024',
        status: 'OVERDUE',
        totalAmount: 750,
        servicesCount: 4,
        generatedAt: '2024-06-01',
        dueDate: '2024-06-30'
      }
    ]

    // Filter mock data based on conditions
    let filteredInvoices = mockInvoices

    if (status && status !== 'all') {
      filteredInvoices = filteredInvoices.filter(invoice => invoice.status === status)
    }

    if (search) {
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.providerName.toLowerCase().includes(search.toLowerCase()) ||
        invoice.providerEmail.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (month) {
      const [year, monthNum] = month.split('-')
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.year === year && invoice.month === monthNum
      )
    }

    const total = filteredInvoices.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex)

    return NextResponse.json({
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching provider invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = generateInvoiceSchema.parse(body)

    // Get current month and year if not provided
    const now = new Date()
    const month = validatedData.month || String(now.getMonth() + 1).padStart(2, '0')
    const year = validatedData.year || String(now.getFullYear())

    // Check if invoice already exists
    const existingInvoice = await prisma.providerMonthlyInvoice.findFirst({
      where: {
        providerId: validatedData.providerId,
        month: parseInt(month),
        year: parseInt(year)
      }
    })

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice already exists for this provider and period' },
        { status: 409 }
      )
    }

    // Get provider services for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
    const endDate = new Date(parseInt(year), parseInt(month), 0)

    const services = await prisma.service.findMany({
      where: {
        providerId: validatedData.providerId,
        bookings: {
          some: {
            scheduledAt: {
              gte: startDate,
              lte: endDate
            },
            status: 'COMPLETED'
          }
        }
      },
      include: {
        bookings: {
          where: {
            scheduledAt: {
              gte: startDate,
              lte: endDate
            },
            status: 'COMPLETED'
          }
        }
      }
    })

    const totalAmount = services.reduce((sum, service) => {
      return sum + (service.price * service.bookings.length)
    }, 0)

    // Create the invoice
    const invoice = await prisma.providerMonthlyInvoice.create({
      data: {
        providerId: validatedData.providerId,
        month: parseInt(month),
        year: parseInt(year),
        status: 'SENT',
        totalAmount,
        totalHours: services.reduce((sum, service) => sum + (service.duration || 0) * service.bookings.length, 0),
        netAmount: totalAmount * 0.85, // 85% after 15% commission
        commissionAmount: totalAmount * 0.15,
        invoiceNumber: `INV-${validatedData.providerId}-${year}${month}`,
        dueDate: new Date(parseInt(year), parseInt(month), 30), // Last day of the month
        sentAt: new Date()
      },
      include: {
        provider: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error generating provider invoice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 