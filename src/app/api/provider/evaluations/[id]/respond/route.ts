import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const responseSchema = z.object({
  response: z.string().min(5, "La réponse doit faire au moins 5 caractères"),
});

// POST - Répondre à une évaluation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || session.user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { response } = responseSchema.parse(body);
    const evaluationId = id;

    // Vérifier que l'évaluation existe et appartient au prestataire
    const evaluation = await prisma.review.findFirst({
      where: {
        id: evaluationId,
        provider: {
          userId: session.user.id,
        },
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        booking: {
          include: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluation not found" },
        { status: 404 },
      );
    }

    if (evaluation.response) {
      return NextResponse.json(
        { error: "Response already exists" },
        { status: 400 },
      );
    }

    // Ajouter la réponse à l'évaluation
    const updatedEvaluation = await prisma.review.update({
      where: { id: evaluationId },
      data: {
        response,
        respondedAt: new Date(),
      },
    });

    // Créer une notification pour le client
    if (evaluation.client?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: evaluation.client.user.id,
          title: "Réponse à votre évaluation",
          content: `Le prestataire a répondu à votre évaluation pour le service "${evaluation.booking?.service?.name}".`,
          type: "EVALUATION_RESPONSE",
          priority: "LOW",
          data: {
            evaluationId: evaluation.id,
            response,
          },
        },
      });
    }

    return NextResponse.json({
      message: "Response added successfully",
      evaluation: {
        id: updatedEvaluation.id,
        response: updatedEvaluation.response,
        respondedAt: updatedEvaluation.respondedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error responding to evaluation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
