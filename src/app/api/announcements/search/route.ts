import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for search request
const searchSchema = z.object({
  query: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(10),
  sortBy: z.enum(["createdAt", "price", "rating"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  filters: z.object({
    vehicleType: z.enum([
      "CAR", "VAN", "TRUCK", "MOTORCYCLE", "BICYCLE", "SCOOTER", "OTHER"
    ]).optional(),
    categoryId: z.string().optional(),
    location: z.object({
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional()
    }).optional(),
    priceRange: z.object({
      min: z.number().nonnegative().optional(),
      max: z.number().positive().optional()
    }).optional(),
    tags: z.array(z.string()).optional(),
    availability: z.object({
      dayOfWeek: z.number().min(0).max(6).optional(),
      timeRange: z.object({
        start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
      }).optional()
    }).optional()
  }).optional().default({})
});

// POST: Advanced search for announcements
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request
    const validation = searchSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { query, page, limit, sortBy, sortOrder, filters } = validation.data;
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build base where clause
    const where: {
      status: string;
      OR?: Array<Record<string, unknown>>;
      vehicleType?: string;
      categoryId?: string;
      pricing?: Record<string, unknown>;
      tags?: Record<string, unknown>;
      AND?: Array<Record<string, unknown>>;
      serviceArea?: Record<string, unknown>;
    } = {
      status: "ACTIVE"
    };
    
    // Apply text search if query provided
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { hasSome: query.split(/\s+/).filter(tag => tag.length > 2) } }
      ];
    }
    
    // Apply vehicle type filter
    if (filters.vehicleType) {
      where.vehicleType = filters.vehicleType;
    }
    
    // Apply category filter
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    
    // Apply price range filter
    if (filters.priceRange) {
      where.pricing = {};
      
      if (filters.priceRange.min !== undefined) {
        where.pricing.basePrice = {
          ...where.pricing.basePrice,
          gte: filters.priceRange.min
        };
      }
      
      if (filters.priceRange.max !== undefined) {
        where.pricing.basePrice = {
          ...where.pricing.basePrice,
          lte: filters.priceRange.max
        };
      }
    }
    
    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      };
    }
    
    // Apply location filter (using serviceArea)
    if (filters.location) {
      const locationFilters = [];
      
      if (filters.location.city) {
        locationFilters.push({
          serviceArea: {
            some: {
              city: { contains: filters.location.city, mode: "insensitive" }
            }
          }
        });
      }
      
      if (filters.location.postalCode) {
        locationFilters.push({
          serviceArea: {
            some: {
              postalCode: { contains: filters.location.postalCode, mode: "insensitive" }
            }
          }
        });
      }
      
      if (filters.location.country) {
        locationFilters.push({
          serviceArea: {
            some: {
              country: { equals: filters.location.country, mode: "insensitive" }
            }
          }
        });
      }
      
      if (locationFilters.length > 0) {
        where.AND = [...(where.AND || []), {
          OR: locationFilters
        }];
      }
    }
    
    // Apply availability filter
    if (filters.availability) {
      const availabilityFilters = [];
      
      if (filters.availability.dayOfWeek !== undefined) {
        availabilityFilters.push({
          availability: {
            some: {
              dayOfWeek: filters.availability.dayOfWeek
            }
          }
        });
      }
      
      if (filters.availability.timeRange?.start && filters.availability.timeRange?.end) {
        availabilityFilters.push({
          availability: {
            some: {
              startTime: { lte: filters.availability.timeRange.end },
              endTime: { gte: filters.availability.timeRange.start }
            }
          }
        });
      } else if (filters.availability.timeRange?.start) {
        availabilityFilters.push({
          availability: {
            some: {
              endTime: { gte: filters.availability.timeRange.start }
            }
          }
        });
      } else if (filters.availability.timeRange?.end) {
        availabilityFilters.push({
          availability: {
            some: {
              startTime: { lte: filters.availability.timeRange.end }
            }
          }
        });
      }
      
      if (availabilityFilters.length > 0) {
        where.AND = [...(where.AND || []), {
          OR: availabilityFilters
        }];
      }
    }
    
    // Define sort options
    let orderBy: Record<string, unknown>;
    
    switch (sortBy) {
      case "price":
        orderBy = {
          pricing: {
            basePrice: sortOrder
          }
        };
        break;
      case "rating":
        orderBy = {
          driver: {
            user: {
              rating: sortOrder
            }
          }
        };
        break;
      case "createdAt":
      default:
        orderBy = {
          createdAt: sortOrder
        };
    }
    
    // Count total results (without pagination)
    const totalCount = await prisma.driverAdvertisement.count({ where });
    
    // Fetch results with pagination
    const advertisements = await prisma.driverAdvertisement.findMany({
      where,
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                rating: true
              }
            }
          }
        },
        category: true,
        serviceArea: true,
        availability: true,
        _count: {
          select: {
            interestedUsers: true,
            responses: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      data: advertisements,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        filters: filters,
        query: query
      }
    });
  } catch (error) {
    console.error("Erreur lors de la recherche d'annonces:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche d'annonces" },
      { status: 500 }
    );
  }
}

interface SearchQuery {
  q?: string;
  city?: string;
  postalCode?: string;
  vehicleType?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  tags?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

// GET: Simple search with query parameters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query: SearchQuery = {
      q: searchParams.get("q") || undefined,
      city: searchParams.get("city") || undefined,
      postalCode: searchParams.get("postalCode") || undefined,
      vehicleType: searchParams.get("vehicleType") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      tags: searchParams.get("tags") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined
    };

    // Parse pagination params
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: "ACTIVE",
    };

    // Text search
    if (query.q) {
      whereClause.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } }
      ];
    }

    // Filter by location
    if (query.city || query.postalCode) {
      whereClause.serviceAreas = {
        some: {
          ...(query.city ? { city: { contains: query.city, mode: "insensitive" } } : {}),
          ...(query.postalCode ? { postalCode: { contains: query.postalCode, mode: "insensitive" } } : {})
        }
      };
    }

    // Filter by vehicle type
    if (query.vehicleType) {
      whereClause.vehicleType = query.vehicleType;
    }

    // Filter by category
    if (query.categoryId) {
      whereClause.categoryId = query.categoryId;
    }

    // Filter by price range
    if (query.minPrice || query.maxPrice) {
      whereClause.pricing = {};
      
      if (query.minPrice) {
        const minPrice = parseFloat(query.minPrice);
        if (!isNaN(minPrice)) {
          whereClause.pricing.basePrice = {
            ...(whereClause.pricing.basePrice || {}),
            gte: minPrice
          };
        }
      }
      
      if (query.maxPrice) {
        const maxPrice = parseFloat(query.maxPrice);
        if (!isNaN(maxPrice)) {
          whereClause.pricing.basePrice = {
            ...(whereClause.pricing.basePrice || {}),
            lte: maxPrice
          };
        }
      }
    }

    // Filter by tags
    if (query.tags) {
      const tagList = query.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagList.length > 0) {
        whereClause.tags = {
          hasSome: tagList
        };
      }
    }

    // Determine sort order
    const orderBy: any = {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'asc' : 'desc';
    
    // Set orderBy based on sortBy parameter
    switch (sortBy) {
      case 'price':
        orderBy.pricing = { basePrice: sortOrder };
        break;
      case 'rating':
        orderBy.driver = { rating: sortOrder };
        break;
      case 'title':
        orderBy.title = sortOrder;
        break;
      default:
        orderBy.createdAt = sortOrder;
    }

    // Execute query with count
    const [advertisements, totalCount] = await Promise.all([
      prisma.driverAdvertisement.findMany({
        where: whereClause,
        include: {
          serviceAreas: true,
          availability: true,
          category: true,
          driver: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.driverAdvertisement.count({ where: whereClause })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: advertisements,
      meta: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error in search endpoint:", error);
    return NextResponse.json(
      { error: "Une erreur s'est produite lors de la recherche" },
      { status: 500 }
    );
  }
} 