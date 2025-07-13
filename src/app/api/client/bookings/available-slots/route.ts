import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const date = searchParams.get("date");

    if (!providerId || !date) {
      return NextResponse.json(
        { error: "Provider ID and date are required" },
        { status: 400 },
      );
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format" },
        { status: 400 },
      );
    }

    // Vérifier que le prestataire existe
    const provider = await db.provider.findUnique({
      where: { id: providerId },
      include: {
        availability: {
          where: {
            dayOfWeek: targetDate.getDay(), // 0 = Dimanche, 1 = Lundi, etc.
            isActive: true,
          },
        },
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 },
      );
    }

    // Récupérer les réservations existantes pour cette date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookings = await db.booking.findMany({
      where: {
        providerId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
        },
      },
      select: {
        scheduledDate: true,
        duration: true,
      },
    });

    // Générer les créneaux disponibles
    const availableSlots: string[] = [];

    if (provider.availability.length > 0) {
      // Utiliser les disponibilités définies
      provider.availability.forEach((avail) => {
        const startHour = parseInt(avail.startTime.split(":")[0]);
        const startMin = parseInt(avail.startTime.split(":")[1]);
        const endHour = parseInt(avail.endTime.split(":")[0]);
        const endMin = parseInt(avail.endTime.split(":")[1]);

        // Générer des créneaux de 30 minutes
        for (
          let h = startHour;
          h < endHour || (h === endHour && startMin < endMin);
          h++
        ) {
          for (let m = h === startHour ? startMin : 0; m < 60; m += 30) {
            if (h === endHour && m >= endMin) break;

            const slotTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
            const slotDateTime = new Date(targetDate);
            slotDateTime.setHours(h, m, 0, 0);

            // Vérifier si le créneau n'est pas déjà réservé
            const isBooked = existingBookings.some((booking) => {
              const bookingStart = new Date(booking.scheduledDate);
              const bookingEnd = new Date(
                bookingStart.getTime() + booking.duration * 60000,
              );

              return slotDateTime >= bookingStart && slotDateTime < bookingEnd;
            });

            // Vérifier que le créneau est dans le futur
            const now = new Date();
            const isInFuture = slotDateTime > now;

            if (!isBooked && isInFuture) {
              availableSlots.push(slotTime);
            }
          }
        }
      });
    } else {
      // Créneaux par défaut (9h-18h) si pas de disponibilités définies
      for (let h = 9; h < 18; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slotTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          const slotDateTime = new Date(targetDate);
          slotDateTime.setHours(h, m, 0, 0);

          // Vérifier si le créneau n'est pas déjà réservé
          const isBooked = existingBookings.some((booking) => {
            const bookingStart = new Date(booking.scheduledDate);
            const bookingEnd = new Date(
              bookingStart.getTime() + booking.duration * 60000,
            );

            return slotDateTime >= bookingStart && slotDateTime < bookingEnd;
          });

          // Vérifier que le créneau est dans le futur
          const now = new Date();
          const isInFuture = slotDateTime > now;

          if (!isBooked && isInFuture) {
            availableSlots.push(slotTime);
          }
        }
      }
    }

    return NextResponse.json({
      slots: availableSlots.sort(),
      date: targetDate.toISOString(),
      providerId,
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
