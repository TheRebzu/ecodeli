import { NextRequest } from "next/server";

// Simple endpoint pour indiquer que Socket.IO est disponible
export async function GET(req: NextRequest) {
  return new Response(
    JSON.stringify({
      status: "Socket.IO server ready",
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

export async function POST() {
  return new Response(
    JSON.stringify({
      message: "Socket.IO endpoint - Use WebSocket connection",
      endpoint: "/socket.io/",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
