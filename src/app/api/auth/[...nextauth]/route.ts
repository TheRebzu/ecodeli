import { NextResponse } from "next/server";
import { GET, POST } from "@/auth";

export { GET, POST };

// Ajouter une route OPTIONS pour gérer les CORS
export function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Allow": "GET, POST, OPTIONS",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
