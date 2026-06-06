import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}
