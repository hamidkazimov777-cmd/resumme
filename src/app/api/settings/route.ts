import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { OWNER_ID, PROVIDERS } from "@/lib/constants";

export async function GET() {
  const settings = await prisma.providerSetting.findMany({ where: { ownerId: OWNER_ID } });
  // Never leak full keys to the client; return a masked hint + presence flag.
  const safe = settings.map((s) => ({
    provider: s.provider,
    baseUrl: s.baseUrl,
    model: s.model,
    isActive: s.isActive,
    hasKey: !!s.apiKey,
    keyHint: s.apiKey ? `••••${s.apiKey.slice(-4)}` : "",
  }));
  return NextResponse.json(safe);
}

const schema = z.object({
  provider: z.enum(["openrouter", "tokenrouter", "anthropic", "moonshot"]),
  apiKey: z.string().optional(), // omitted => keep existing
  model: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { provider, apiKey, model, isActive } = parsed.data;
  const baseUrl = PROVIDERS[provider].baseUrl;

  const existing = await prisma.providerSetting.findUnique({
    where: { ownerId_provider: { ownerId: OWNER_ID, provider } },
  });

  const setting = await prisma.providerSetting.upsert({
    where: { ownerId_provider: { ownerId: OWNER_ID, provider } },
    create: {
      ownerId: OWNER_ID,
      provider,
      baseUrl,
      apiKey: apiKey ?? "",
      model: model ?? null,
      isActive: isActive ?? false,
    },
    update: {
      baseUrl,
      ...(apiKey !== undefined ? { apiKey } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  // Only one active provider at a time.
  if (isActive) {
    await prisma.providerSetting.updateMany({
      where: { ownerId: OWNER_ID, provider: { not: provider } },
      data: { isActive: false },
    });
  }

  return NextResponse.json({ ok: true, provider: setting.provider });
}
