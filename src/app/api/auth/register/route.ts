import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/server/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const isFirstUser = (await prisma.user.count()) === 0;
  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(parsed.data.password), name: parsed.data.name?.trim() || null },
  });

  // First registered user adopts any legacy single-owner data (ownerId="owner"),
  // so the original local profile / provider / history carry over to the account.
  if (isFirstUser) {
    await prisma.$transaction([
      prisma.profile.updateMany({ where: { ownerId: "owner" }, data: { ownerId: user.id } }),
      prisma.providerSetting.updateMany({ where: { ownerId: "owner" }, data: { ownerId: user.id } }),
      prisma.job.updateMany({ where: { ownerId: "owner" }, data: { ownerId: user.id } }),
      prisma.generation.updateMany({ where: { ownerId: "owner" }, data: { ownerId: user.id } }),
    ]);
  }

  const { token } = await createSession(user.id);
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  setSessionCookie(res, token);
  return res;
}
