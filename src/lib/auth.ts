import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getOrCreateDbUser() {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  let dbUser = await prisma.user.findUnique({
    where: { supabaseUserId: authUser.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        supabaseUserId: authUser.id,
        email: authUser.email ?? "",
        name:
          authUser.user_metadata?.full_name ??
          authUser.user_metadata?.name ??
          authUser.email?.split("@")[0] ??
          "Student",
      },
    });
  }

  return dbUser;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
