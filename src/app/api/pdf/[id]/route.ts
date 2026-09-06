import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { ResumePDF, CoverLetterPDF } from "@/lib/pdf/documents";
import { getTheme } from "@/lib/design/templates";
import { getOrCreateProfile } from "@/server/profile";
import { currentUserId, unauthorized } from "@/server/auth";
import type { ResumeDoc, CoverLetterDoc } from "@/lib/types";

// Load the candidate photo as a data URI so react-pdf can embed it (CSP/file
// access aside, an inline data URI is the most portable path).
async function loadPhotoDataUri(photoPath: string): Promise<string | undefined> {
  try {
    const abs = path.join(process.cwd(), "public", photoPath.replace(/^\/+/, ""));
    const buf = await readFile(abs);
    const ext = photoPath.split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const { id } = await params;
  const gen = await prisma.generation.findFirst({ where: { id, ownerId: userId } });
  if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = (gen.format === "Letter" ? "Letter" : "A4") as "A4" | "Letter";
  const content = JSON.parse(gen.content);

  // Template: query override (instant preview) falls back to the stored one.
  const override = req.nextUrl.searchParams.get("template");
  const template = getTheme(override ?? gen.template).id;

  let element: React.ReactElement;
  if (gen.kind === "resume") {
    let photoSrc: string | undefined;
    if (getTheme(template).showPhoto) {
      const profile = await getOrCreateProfile(userId);
      if (profile.photoPath) photoSrc = await loadPhotoDataUri(profile.photoPath);
    }
    element = React.createElement(ResumePDF, { doc: content as ResumeDoc, format, template, photoSrc });
  } else {
    element = React.createElement(CoverLetterPDF, { doc: content as CoverLetterDoc, format, template });
  }

  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  const name = `${gen.kind}-v${gen.version}-${template}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
    },
  });
}
