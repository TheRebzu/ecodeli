import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  merchantProcedure,
  providerProcedure,
} from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const invoiceRouter = router({
  // Get all invoices for the current user (merchant or provider)
  getUserInvoices: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const userRole = ctx.session?.user?.role;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { limit, cursor, status, startDate, endDate } = input;

      // Get invoices based on user role
      const invoices = await prisma.invoice.findMany({
        where: {
          ...(userRole === "MERCHANT" ? { merchantId: userId } : {}),
          ...(userRole === "PROVIDER" ? { providerId: userId } : {}),
          ...(status ? { status } : {}),
          ...(startDate ? { createdAt: { gte: startDate } } : {}),
          ...(endDate ? { createdAt: { lte: endDate } } : {}),
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          payments: true,
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (invoices.length > limit) {
        const nextItem = invoices.pop();
        nextCursor = nextItem?.id;
      }

      return {
        invoices,
        nextCursor,
      };
    }),

  // Get a specific invoice by ID
  getInvoiceById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const userRole = ctx.session?.user?.role;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: input.id },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
              stores: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                  postalCode: true,
                },
              },
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              serviceProvider: {
                select: {
                  id: true,
                  businessName: true,
                  businessAddress: true,
                  siret: true,
                },
              },
            },
          },
          invoiceItems: true,
          payments: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Check if user has access to this invoice
      if (
        userRole !== "ADMIN" &&
        invoice.merchantId !== userId &&
        invoice.providerId !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this invoice",
        });
      }

      return invoice;
    }),

  // Generate invoice for a merchant (admin only)
  generateMerchantInvoice: adminProcedure
    .input(
      z.object({
        merchantId: z.string(),
        dueDate: z.date(),
        items: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            taxRate: z.number().min(0).max(100).default(20), // Default French VAT rate
          }),
        ),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { merchantId, dueDate, items, notes } = input;

      // Check if merchant exists
      const merchant = await prisma.user.findUnique({
        where: { id: merchantId, role: "MERCHANT" },
      });

      if (!merchant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Merchant not found",
        });
      }

      // Calculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      const taxAmount = items.reduce(
        (sum, item) =>
          sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
        0,
      );

      const total = subtotal + taxAmount;

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          merchantId,
          invoiceNumber: await generateInvoiceNumber(),
          status: "PENDING",
          subtotal,
          taxAmount,
          total,
          dueDate,
          notes,
          invoiceItems: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: item.quantity * item.unitPrice * (1 + item.taxRate / 100),
            })),
          },
        },
        include: {
          invoiceItems: true,
        },
      });

      return invoice;
    }),

  // Generate invoice for a provider (admin only)
  generateProviderInvoice: adminProcedure
    .input(
      z.object({
        providerId: z.string(),
        dueDate: z.date(),
        items: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            taxRate: z.number().min(0).max(100).default(20), // Default French VAT rate
          }),
        ),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { providerId, dueDate, items, notes } = input;

      // Check if provider exists
      const provider = await prisma.user.findUnique({
        where: { id: providerId, role: "PROVIDER" },
      });

      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      // Calculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      const taxAmount = items.reduce(
        (sum, item) =>
          sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
        0,
      );

      const total = subtotal + taxAmount;

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          providerId,
          invoiceNumber: await generateInvoiceNumber(),
          status: "PENDING",
          subtotal,
          taxAmount,
          total,
          dueDate,
          notes,
          invoiceItems: {
            create: items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              total: item.quantity * item.unitPrice * (1 + item.taxRate / 100),
            })),
          },
        },
        include: {
          invoiceItems: true,
        },
      });

      return invoice;
    }),

  // Generate monthly invoices for all providers (admin only)
  generateMonthlyProviderInvoices: adminProcedure
    .input(
      z.object({
        month: z.date(),
        dueDate: z.date().optional(), // Default to 30 days after generation
      }),
    )
    .mutation(async ({ input }) => {
      const { month, dueDate } = input;

      // Set the date range for the month
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // Default due date to 30 days from now if not provided
      const defaultDueDate =
        dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Get all providers
      const providers = await prisma.user.findMany({
        where: { role: "PROVIDER" },
        include: {
          serviceProvider: true,
          providerAppointments: {
            where: {
              status: "COMPLETED",
              startTime: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            include: {
              service: true,
            },
          },
        },
      });

      const results = [];

      // Generate invoice for each provider with appointments
      for (const provider of providers) {
        if (provider.providerAppointments.length === 0) {
          continue; // Skip providers with no appointments
        }

        // Group appointments by service for invoice items
        const serviceMap = new Map();

        for (const appointment of provider.providerAppointments) {
          const service = appointment.service;
          const key = service.id;

          if (!serviceMap.has(key)) {
            serviceMap.set(key, {
              service,
              count: 0,
              totalAmount: 0,
            });
          }

          const item = serviceMap.get(key);
          item.count += 1;
          item.totalAmount += service.price;
        }

        // Create invoice items from services
        const invoiceItems = Array.from(serviceMap.values()).map((item) => ({
          description: `${item.service.title} (${item.count} appointments)`,
          quantity: item.count,
          unitPrice: item.service.price,
          taxRate: 20, // Default VAT rate
          total: item.totalAmount * 1.2, // Including tax
        }));

        // Calculate totals
        const subtotal = invoiceItems.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        );
        const taxAmount = subtotal * 0.2; // 20% VAT
        const total = subtotal + taxAmount;

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            providerId: provider.id,
            invoiceNumber: await generateInvoiceNumber(),
            status: "PENDING",
            subtotal,
            taxAmount,
            total,
            dueDate: defaultDueDate,
            notes: `Auto-generated monthly invoice for ${startOfMonth.toLocaleString("default", { month: "long", year: "numeric" })}`,
            invoiceItems: {
              create: invoiceItems,
            },
          },
          include: {
            invoiceItems: true,
          },
        });

        results.push(invoice);
      }

      return {
        success: true,
        invoiceCount: results.length,
        invoices: results,
      };
    }),

  // Pay an invoice (for merchants)
  payInvoice: merchantProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        paymentMethodId: z.string().optional(), // For Stripe integration
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session?.user?.id;
      const { invoiceId, paymentMethodId } = input;

      // Check if invoice exists and belongs to this merchant
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice.merchantId !== merchantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot pay this invoice",
        });
      }

      if (invoice.status !== "PENDING" && invoice.status !== "OVERDUE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invoice cannot be paid (status: ${invoice.status})`,
        });
      }

      // Create a payment record
      // In a real implementation, this would integrate with Stripe or another payment provider
      const payment = await prisma.payment.create({
        data: {
          amount: invoice.total,
          type: "SUBSCRIPTION", // Using the subscription type for invoices
          status: "PAID",
          externalId: paymentMethodId, // Store Stripe payment ID here
        },
      });

      // Update invoice status
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          payments: {
            connect: { id: payment.id },
          },
        },
        include: {
          payments: true,
        },
      });

      return updatedInvoice;
    }),

  // Cancel an invoice (admin only)
  cancelInvoice: adminProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { invoiceId, reason } = input;

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot cancel a paid invoice",
        });
      }

      return await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "CANCELLED",
          notes: reason
            ? `${invoice.notes ? invoice.notes + "\n\n" : ""}CANCELLED: ${reason}`
            : invoice.notes,
        },
      });
    }),

  // Generate PDF version of invoice
  generateInvoicePdf: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const userRole = ctx.session?.user?.role;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: input.invoiceId },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
              stores: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                  postalCode: true,
                },
              },
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              email: true,
              serviceProvider: {
                select: {
                  id: true,
                  businessName: true,
                  businessAddress: true,
                  siret: true,
                },
              },
            },
          },
          invoiceItems: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Check if user has access to this invoice
      if (
        userRole !== "ADMIN" &&
        invoice.merchantId !== userId &&
        invoice.providerId !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this invoice",
        });
      }

      // In a real implementation, this would generate a PDF using a library
      // For now, just return a mock URL with invoice details

      return {
        success: true,
        pdfUrl: `https://ecodeli.example.com/invoices/${invoice.invoiceNumber}.pdf`,
        invoiceNumber: invoice.invoiceNumber,
      };
    }),
});

// Helper function to generate a unique invoice number
async function generateInvoiceNumber(): Promise<string> {
  // Get the current date
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  // Get the last invoice number for this month
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `ED-${year}${month}`,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
  });

  let nextNumber = 1;

  if (lastInvoice) {
    // Extract the sequence number from the last invoice
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split("-")[2]);
    if (!isNaN(lastSequence)) {
      nextNumber = lastSequence + 1;
    }
  }

  // Format: ED-YYM-XXXX (where XXXX is sequential)
  return `ED-${year}${month}-${nextNumber.toString().padStart(4, "0")}`;
}
