import { Job } from "@/components/JobCard";

export type CCAction = "none" | "deliver" | "collect";

export interface StopJob {
  job: Job;
  ccAction: CCAction;
}

/** A combined stop = one or more jobs at the same address, visited once. */
export interface Stop {
  address: string;
  postcode: string;
  jobs: StopJob[];
  /** True if ALL jobs at this stop are self-contained (CC exchange). */
  allSolo: boolean;
}

export type PlanStep =
  | { kind: "split"; driver1: Stop; driver2: Stop }
  | { kind: "convoy"; stop: Stop };

export function getCCAction(job: Job): CCAction {
  const notes = job.notes ?? "";
  if (notes.includes("Deliver courtesy car") || notes.includes("deliver courtesy car")) return "deliver";
  if (notes.includes("Collect courtesy car") || notes.includes("collect courtesy car")) return "collect";
  return "none";
}

/** A solo job is self-contained: driver leaves in one car and returns in another. */
export function isSolo(job: Job): boolean {
  const cc = getCCAction(job);
  if (job.type === "collection" && cc === "deliver") return true; // drive CC there, bring customer car back
  if (job.type === "delivery" && cc === "collect") return true;   // drive customer car there, bring CC back
  return false;
}

/** Group jobs (in sort order) into stops by shared address, then produce a team plan. */
export function buildTeamPlan(jobs: Job[]): PlanStep[] {
  const active = jobs
    .filter((j) => j.status !== "done" && j.status !== "cancelled")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Group by address string so same-location jobs become one stop
  const stopMap = new Map<string, StopJob[]>();
  const stopOrder: string[] = [];

  for (const job of active) {
    const key = `${job.address.toUpperCase().trim()}, ${job.postcode.toUpperCase().trim()}`;
    if (!stopMap.has(key)) {
      stopMap.set(key, []);
      stopOrder.push(key);
    }
    stopMap.get(key)!.push({ job, ccAction: getCCAction(job) });
  }

  const stops: Stop[] = stopOrder.map((key) => {
    const sj = stopMap.get(key)!;
    return {
      address: sj[0].job.address,
      postcode: sj[0].job.postcode,
      jobs: sj,
      allSolo: sj.every((s) => isSolo(s.job)),
    };
  });

  // Pull all-solo stops out; attempt to pair them into "split" steps.
  // Convoy stops stay in original order; solo pairs are inserted before
  // the first convoy stop that follows them.
  const plan: PlanStep[] = [];
  const soloQueue: Stop[] = [];

  function flushSolos() {
    while (soloQueue.length >= 2) {
      plan.push({ kind: "split", driver1: soloQueue.shift()!, driver2: soloQueue.shift()! });
    }
    // Unpaired solo → still convoy (driver 2 waits or returns first)
    for (const s of soloQueue) {
      plan.push({ kind: "convoy", stop: s });
    }
    soloQueue.length = 0;
  }

  for (const stop of stops) {
    if (stop.allSolo) {
      soloQueue.push(stop);
    } else {
      flushSolos();
      plan.push({ kind: "convoy", stop });
    }
  }
  flushSolos();

  return plan;
}

export function convoyDescription(stop: Stop): string {
  const deliveries = stop.jobs.filter((s) => s.job.type === "delivery");
  const collections = stop.jobs.filter((s) => s.job.type === "collection");
  const parts: string[] = [];
  if (deliveries.length) parts.push(`drop off ${deliveries.length} car${deliveries.length > 1 ? "s" : ""}`);
  if (collections.length) parts.push(`collect ${collections.length} car${collections.length > 1 ? "s" : ""}`);
  return parts.join(", then ");
}

export function soloDescription(sj: StopJob): string {
  if (sj.job.type === "collection" && sj.ccAction === "deliver") {
    return "Drive courtesy car out, collect customer car, drive it back";
  }
  if (sj.job.type === "delivery" && sj.ccAction === "collect") {
    return "Drive customer car out, collect courtesy car, drive it back";
  }
  return sj.job.type === "collection" ? "Collect car" : "Deliver car";
}
