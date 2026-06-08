import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/maps";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  let coords: { lat: number; lng: number } | null = null;
  if (body.address || body.postcode) {
    const existing = await prisma.job.findUnique({ where: { id } });
    const addr = `${body.address ?? existing?.address}, ${body.postcode ?? existing?.postcode}`;
    coords = await geocode(addr);
  }

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...body,
      ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
    },
  });

  return NextResponse.json(job);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
