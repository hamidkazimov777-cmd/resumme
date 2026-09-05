import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { ResumePDF, CoverLetterPDF } from "@/lib/pdf/documents";
import type { ResumeDoc, CoverLetterDoc } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gen = await prisma.generation.findUnique({ where: { id } });
  if (!gen) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const format = (gen.format === "Letter" ? "Letter" : "A4") as "A4" | "Letter";
  const content = JSON.parse(gen.content);

  const element =
    gen.kind === "resume"
      ? React.createElement(ResumePDF, { doc: content as ResumeDoc, format })
      : React.createElement(CoverLetterPDF, { doc: content as CoverLetterDoc, format });

  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  const name = `${gen.kind}-v${gen.version}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"`,
    },
  });
}
