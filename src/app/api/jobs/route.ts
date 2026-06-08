import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/maps";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // YYYY-MM-DD

  const start = date ? new Date(`${date}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const jobs = await prisma.job.findMany({
    where: { jobDate: { gte: start, lt: end } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, address, postcode, type, notes, jobDate } = body;

  const fullAddress = `${address}, ${postcode}`;
  const coords = await geocode(fullAddress);

  const job = await prisma.job.create({
    data: {
      customerName,
      address,
      postcode,
      type,
      notes: notes ?? null,
      jobDate: jobDate ? new Date(jobDate) : new Date(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    },
  });

  return NextResponse.json(job, { status: 201 });
}
