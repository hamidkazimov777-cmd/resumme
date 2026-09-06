import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PROVIDERS } from "@/lib/constants";
import { listModels } from "@/lib/ai/client";
import { decryptSecret } from "@/lib/crypto";
import { currentUserId, unauthorized } from "@/server/auth";

const schema = z.object({
  provider: z.enum(["openrouter", "tokenrouter", "anthropic", "moonshot"]),
  apiKey: z.string().optional(), // if omitted, use stored key
});

// Fetch available models for a provider given its API key.
export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { provider } = parsed.data;
  const baseUrl = PROVIDERS[provider].baseUrl;

  let apiKey = parsed.data.apiKey;
  if (!apiKey) {
    const stored = await prisma.providerSetting.findUnique({
      where: { ownerId_provider: { ownerId: userId, provider } },
    });
    apiKey = stored?.apiKey ? decryptSecret(stored.apiKey) : undefined;
  }
  if (!apiKey) return NextResponse.json({ error: "Provide an API key first." }, { status: 400 });

  try {
    const models = await listModels(provider, baseUrl, apiKey);
    return NextResponse.json({ models });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
