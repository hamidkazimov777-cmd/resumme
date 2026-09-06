import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUserId, unauthorized } from "@/server/auth";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const jobs = await prisma.job.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { generations: { orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(jobs);
}
