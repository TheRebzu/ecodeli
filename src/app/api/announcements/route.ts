import { NextRequest, NextResponse } from "next/server";
import { AnnouncementService } from "@/lib/services/client/announcement.service";
import { auth } from "@/auth";

// GET: List announcements
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Récupérer les paramètres de requête
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const fromDate = searchParams.get("fromDate")
      ? new Date(searchParams.get("fromDate") as string)
      : undefined;
    const toDate = searchParams.get("toDate")
      ? new Date(searchParams.get("toDate") as string)
      : undefined;

    // Récupérer les annonces du client
    const result = await AnnouncementService.getClientAnnouncements(
      session.user.id,
      {
        status: status || undefined,
        search: search || undefined,
        fromDate,
        toDate,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new announcement
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Récupérer les données du corps de la requête
    const data = await req.json();

    // Validation basique
    if (!data.title || !data.packageType || !data.weight || !data.price) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Créer l'annonce
    const result = await AnnouncementService.createAnnouncement(
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an announcement
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Récupérer l'ID de l'annonce à supprimer
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    // Supprimer l'annonce
    const result = await AnnouncementService.deleteAnnouncement(
      session.user.id,
      id
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update an announcement
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Récupérer les données du corps de la requête
    const data = await req.json();

    // Validation basique
    if (!data.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Announcement ID is required",
        },
        { status: 400 }
      );
    }

    // Mettre à jour l'annonce
    const result = await AnnouncementService.updateAnnouncement(
      session.user.id,
      data
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating announcement:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 