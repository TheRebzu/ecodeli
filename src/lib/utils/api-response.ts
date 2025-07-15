import { NextResponse } from "next/server";
import { z } from "zod";

export class ApiResponse {
  static success(data: any, status = 200) {
    return NextResponse.json({ success: true, data }, { status });
  }

  static error(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
  }

  static paginated(data: any[], total: number, page: number, limit: number) {
    return NextResponse.json({
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}

export function handleApiError(error: any, operation: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.issues },
      { status: 400 },
    );
  }

  if (error.code === "P2002") {
    // Prisma unique constraint
    return NextResponse.json(
      { error: "Resource already exists" },
      { status: 409 },
    );
  }

  if (error.code === "P2025") {
    // Prisma record not found
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
