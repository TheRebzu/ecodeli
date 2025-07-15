import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";

export async function GET(request: NextRequest) {
  try {
    // DEBUG: log cookies reçus
    const cookieHeader = request.headers.get("cookie");
    console.log("[DEBUG /api/debug/user-role] Cookies reçus:", cookieHeader);

    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        {
          error: "No user found in session",
          authenticated: false,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roleType: typeof user.role,
        isActive: user.isActive,
        validationStatus: user.validationStatus,
        profile: user.profile
          ? {
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
            }
          : null,
        roleChecks: {
          isClient: user.role === "CLIENT",
          isDeliverer: user.role === "DELIVERER",
          isMerchant: user.role === "MERCHANT",
          isProvider: user.role === "PROVIDER",
          isAdmin: user.role === "ADMIN",
        },
      },
    });
  } catch (error) {
    console.error("Error in debug user-role:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
