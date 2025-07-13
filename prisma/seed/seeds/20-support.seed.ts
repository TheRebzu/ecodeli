import { SeedContext } from "../index";
import { CONSTANTS } from "../data/constants";
import { generateTicketNumber } from "../utils/generators/code-generator";

export async function seedSupport(ctx: SeedContext) {
  const { prisma } = ctx;
  const users = ctx.data.get("users") || [];

  console.log("   Creating support tickets...");

  const tickets = [];

  // Créer quelques tickets simples
  const clients = users.filter((u: any) => u.role === "CLIENT").slice(0, 3);
  const admins = users.filter((u: any) => u.role === "ADMIN");
  const supportAdmin = admins[0];

  if (!supportAdmin || clients.length === 0) {
    console.log("   No clients or admin found, skipping support tickets");
    return { tickets: [], messages: [] };
  }

  const categories = [
    "DELIVERY_ISSUE",
    "PAYMENT_PROBLEM",
    "ACCOUNT_ACCESS",
    "TECHNICAL_SUPPORT",
    "GENERAL_INQUIRY",
  ];
  const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  const priorities = ["LOW", "MEDIUM", "HIGH"];

  for (let i = 0; i < 5; i++) {
    const client = clients[i % clients.length];
    const category = categories[i % categories.length];
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];

    const createdAt = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    );
    const resolvedAt =
      status === "RESOLVED" || status === "CLOSED"
        ? new Date(
            createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000,
          )
        : null;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: generateTicketNumber(),
        authorId: client.id,
        title: `Support ticket ${i + 1} - ${category}`,
        description: `Description du problème ${i + 1}`,
        category: category as any,
        status: status as any,
        priority: priority as any,
        assignedToId: status !== "OPEN" ? supportAdmin.id : null,
        resolvedAt,
        createdAt,
      },
    });
    tickets.push(ticket);

    // Créer un message initial
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: client.id,
        content: `Message initial pour le ticket ${i + 1}`,
        isInternal: false,
        createdAt,
      },
    });

    // Créer une réponse si le ticket n'est pas ouvert
    if (status !== "OPEN" && supportAdmin) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: supportAdmin.id,
          content: `Réponse du support pour le ticket ${i + 1}`,
          isInternal: false,
          createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
        },
      });
    }
  }

  // Créer quelques templates simples
  const templates = [
    {
      name: "Problème de livraison",
      category: "DELIVERY_ISSUE",
      content: "Nous allons vérifier avec le livreur.",
    },
    {
      name: "Problème de paiement",
      category: "PAYMENT_PROBLEM",
      content: "Nous vérifions votre paiement.",
    },
    {
      name: "Problème de compte",
      category: "ACCOUNT_ACCESS",
      content: "Nous allons vérifier votre compte.",
    },
  ];

  for (const template of templates) {
    await prisma.supportTemplate.create({
      data: {
        name: template.name,
        subject: template.name,
        category: template.category as any,
        content: template.content,
        isActive: true,
        usageCount: 0,
        createdById: supportAdmin.id,
      },
    });
  }

  console.log(`   ✓ Created ${tickets.length} support tickets`);
  console.log(`   ✓ Created ${templates.length} response templates`);

  return { tickets, messages: [] };
}
