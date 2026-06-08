import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optimizeRoute } from "@/lib/maps";

export async function POST(req: NextRequest) {
  try {
    const { date } = await req.json();

    const start = date ? new Date(`${date}T00:00:00`) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [jobs, depot] = await Promise.all([
      prisma.job.findMany({
        where: {
          jobDate: { gte: start, lt: end },
          status: { in: ["pending", "in_progress"] },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.depot.findUnique({ where: { id: 1 } }),
    ]);

    if (!depot) {
      return NextResponse.json({ error: "Depot address not set. Go to Settings to configure it." }, { status: 400 });
    }

    if (jobs.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const origin = `${depot.address}, ${depot.postcode}`;
    const waypoints = jobs.map((j) => `${j.address}, ${j.postcode}`);

    const { waypointOrder } = await optimizeRoute(origin, waypoints);

    await Promise.all(
      waypointOrder.map((originalIdx, newPosition) =>
        prisma.job.update({
          where: { id: jobs[originalIdx].id },
          data: { sortOrder: newPosition },
        })
      )
    );

    const ordered = waypointOrder.map((i) => jobs[i]);
    return NextResponse.json({ jobs: ordered });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Optimisation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
