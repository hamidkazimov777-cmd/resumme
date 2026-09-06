import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUserId, unauthorized } from "@/server/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, ownerId: userId },
    include: { generations: { orderBy: { createdAt: "desc" } } },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, ownerId: userId } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
