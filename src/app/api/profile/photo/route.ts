import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { imageSize } from "image-size";
import { prisma } from "@/lib/db";
import { getOrCreateProfile } from "@/server/profile";
import { currentUserId, unauthorized } from "@/server/auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
// What the bytes actually are, as reported by image-size. The declared MIME
// type is whatever the client typed into the request, so it decides nothing on
// its own: the extension we store and the format check both come from here.
const ALLOWED_FORMATS: Record<string, string> = { jpg: "jpg", png: "png", webp: "webp" };
// CV portrait guidance: 3x4 ≈ ratio 0.75. Accept a tolerant window.
const MIN_RATIO = 0.6;
const MAX_RATIO = 0.9;
const MIN_DIM = 300; // px shortest side

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const form = await req.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use JPEG, PNG or WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // imageSize throws on anything it cannot parse, and an upload is caller data,
  // so a text file renamed to .png used to come back as a 500.
  let dim;
  try {
    dim = imageSize(buffer);
  } catch {
    return NextResponse.json({ error: "That file is not a readable image." }, { status: 400 });
  }
  const format = dim.type ? ALLOWED_FORMATS[dim.type] : undefined;
  if (!format) {
    return NextResponse.json({ error: "Use JPEG, PNG or WebP." }, { status: 400 });
  }
  const width = dim.width ?? 0;
  const height = dim.height ?? 0;
  if (!width || !height) {
    return NextResponse.json({ error: "Could not read image dimensions." }, { status: 400 });
  }

  const ratio = width / height;
  const warnings: string[] = [];
  if (Math.min(width, height) < MIN_DIM) {
    warnings.push(`Low resolution (${width}×${height}). Use at least ${MIN_DIM}px on the short side.`);
  }
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
    warnings.push(
      `Aspect ratio ${ratio.toFixed(2)} is off. A CV portrait (3×4 ≈ 0.75) reads best.`
    );
  }

  const profile = await getOrCreateProfile(userId);
  const ext = format;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `photo-${profile.id}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  const photoPath = `/uploads/${filename}`;

  await prisma.profile.update({
    where: { id: profile.id },
    data: { photoPath, photoWidth: width, photoHeight: height },
  });

  return NextResponse.json({ photoPath, width, height, warnings });
}
