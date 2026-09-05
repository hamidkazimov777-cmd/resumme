import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OWNER_ID } from "@/lib/constants";

export async function GET() {
  const jobs = await prisma.job.findMany({
    where: { ownerId: OWNER_ID },
    orderBy: { createdAt: "desc" },
    include: { generations: { orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(jobs);
}
