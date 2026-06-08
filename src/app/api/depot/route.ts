import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/maps";

export async function GET() {
  const depot = await prisma.depot.findUnique({ where: { id: 1 } });
  return NextResponse.json(depot ?? null);
}

export async function PUT(req: NextRequest) {
  const { address, postcode } = await req.json();
  const coords = await geocode(`${address}, ${postcode}`);

  const depot = await prisma.depot.upsert({
    where: { id: 1 },
    update: { address, postcode, lat: coords?.lat ?? null, lng: coords?.lng ?? null },
    create: { id: 1, address, postcode, lat: coords?.lat ?? null, lng: coords?.lng ?? null },
  });

  return NextResponse.json(depot);
}
