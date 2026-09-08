import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUserId, unauthorized } from "@/server/auth";

const patchSchema = z.object({
  template: z.enum(["ats", "modern", "photo", "executive"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid template." }, { status: 400 });

  const gen = await prisma.generation.findFirst({ where: { id, ownerId: userId } });
  if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  const updated = await prisma.generation.update({
    where: { id },
    data: { ...(parsed.data.template ? { template: parsed.data.template } : {}) },
  });

  return NextResponse.json({ id: updated.id, template: updated.template });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  const gen = await prisma.generation.findFirst({ where: { id, ownerId: userId } });
  if (!gen) return NextResponse.json({ error: "Generation not found." }, { status: 404 });

  await prisma.generation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
