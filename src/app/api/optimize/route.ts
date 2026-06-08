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
        where: { jobDate: { gte: start, lt: end }, status: { in: ["pending", "in_progress"] } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.depot.findUnique({ where: { id: 1 } }),
    ]);

    if (!depot) {
      return NextResponse.json({ error: "Depot address not set. Go to Settings to configure it." }, { status: 400 });
    }
    if (jobs.length === 0) return NextResponse.json({ jobs: [] });

    const locked = jobs.filter((j) => j.locked);
    const unlocked = jobs.filter((j) => !j.locked);

    let finalOrder: typeof jobs;

    if (unlocked.length === 0) {
      // All locked — nothing to optimise
      finalOrder = jobs;
    } else if (locked.length === 0) {
      // No locks — optimise everything
      const origin = `${depot.address}, ${depot.postcode}`;
      const waypoints = unlocked.map((j) => `${j.address}, ${j.postcode}`);
      const { waypointOrder } = await optimizeRoute(origin, waypoints);
      finalOrder = waypointOrder.map((i) => unlocked[i]);
    } else {
      // Mix of locked and unlocked:
      // 1. Optimise just the unlocked jobs
      // 2. Slot them into the positions not occupied by locked jobs
      const origin = `${depot.address}, ${depot.postcode}`;
      const waypoints = unlocked.map((j) => `${j.address}, ${j.postcode}`);
      const { waypointOrder } = await optimizeRoute(origin, waypoints);
      const optimisedUnlocked = waypointOrder.map((i) => unlocked[i]);

      // Locked jobs keep their current sortOrder positions
      // Build final array: place locked jobs at their positions, fill gaps with optimised unlocked
      const totalSlots = jobs.length;
      const result: (typeof jobs[0] | null)[] = new Array(totalSlots).fill(null);

      // Place locked jobs at their current positions (clamped to valid range)
      for (const job of locked) {
        const pos = Math.min(job.sortOrder, totalSlots - 1);
        result[pos] = job;
      }

      // Fill gaps with optimised unlocked jobs in order
      let ui = 0;
      for (let i = 0; i < totalSlots; i++) {
        if (result[i] === null && ui < optimisedUnlocked.length) {
          result[i] = optimisedUnlocked[ui++];
        }
      }

      finalOrder = result.filter(Boolean) as typeof jobs;
    }

    // Persist final sort order
    await Promise.all(
      finalOrder.map((job, i) =>
        prisma.job.update({ where: { id: job.id }, data: { sortOrder: i } })
      )
    );

    return NextResponse.json({ jobs: finalOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Optimisation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
