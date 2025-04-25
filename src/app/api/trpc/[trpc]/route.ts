import { NextResponse } from "next/server";

const handler = async (req: Request) => {
  return NextResponse.json({ message: "tRPC API endpoint placeholder" });
};

export { handler as GET, handler as POST };
