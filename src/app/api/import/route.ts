import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { parseDiary } from "@/lib/parseDiary";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/maps";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
  }

  // Optional date override from the client (YYYY-MM-DD) — use this instead of the PDF's date
  const dateOverride = formData.get("date") as string | null;
  const jobDate = dateOverride ? new Date(`${dateOverride}T00:00:00`) : null;

  const buffer = Buffer.from(await file.arrayBuffer());

  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();

  const parsed = parseDiary(text).map((job) => ({
    ...job,
    jobDate: jobDate ?? job.jobDate,
  }));

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No jobs found in this PDF. Make sure it's a Drivers Diary export." },
      { status: 422 }
    );
  }

  // Geocode addresses in parallel (best-effort)
  const withCoords = await Promise.all(
    parsed.map(async (job) => {
      const coords = await geocode(`${job.address}, ${job.postcode}`).catch(() => null);
      return { ...job, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
    })
  );

  const created = await Promise.all(
    withCoords.map((job) => prisma.job.create({ data: job }))
  );

  return NextResponse.json({ count: created.length, jobs: created });
}
