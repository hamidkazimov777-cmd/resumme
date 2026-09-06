import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PROVIDERS } from "@/lib/constants";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { currentUserId, unauthorized } from "@/server/auth";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const settings = await prisma.providerSetting.findMany({ where: { ownerId: userId } });
  // Never return the key; expose only presence + a masked hint (decrypt to mask).
  const safe = settings.map((s) => {
    let keyHint = "";
    if (s.apiKey) {
      try {
        keyHint = maskSecret(decryptSecret(s.apiKey));
      } catch {
        keyHint = "••••";
      }
    }
    return { provider: s.provider, baseUrl: s.baseUrl, model: s.model, isActive: s.isActive, hasKey: !!s.apiKey, keyHint };
  });
  return NextResponse.json(safe);
}

const schema = z.object({
  provider: z.enum(["openrouter", "tokenrouter", "anthropic", "moonshot"]),
  apiKey: z.string().optional(), // omitted => keep existing
  model: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { provider, apiKey, model, isActive } = parsed.data;
  const baseUrl = PROVIDERS[provider].baseUrl;

  const setting = await prisma.providerSetting.upsert({
    where: { ownerId_provider: { ownerId: userId, provider } },
    create: {
      ownerId: userId,
      provider,
      baseUrl,
      apiKey: apiKey ? encryptSecret(apiKey) : "",
      model: model ?? null,
      isActive: isActive ?? false,
    },
    update: {
      baseUrl,
      ...(apiKey !== undefined ? { apiKey: apiKey ? encryptSecret(apiKey) : "" } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  // Only one active provider at a time.
  if (isActive) {
    await prisma.providerSetting.updateMany({
      where: { ownerId: userId, provider: { not: provider } },
      data: { isActive: false },
    });
  }

  return NextResponse.json({ ok: true, provider: setting.provider });
}
