"use client";

import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, ArrowRight, Users, User } from "lucide-react";
import JobCard, { Job } from "./JobCard";
import { buildTeamPlan, needsDepotReturn } from "@/lib/teamPlan";

// ── Sortable wrapper around JobCard ──────────────────────────────────────────

function SortableJobCard({ job, position, onUpdate }: {
  job: Job; position: number; onUpdate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id, disabled: job.locked });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <JobCard
        job={job}
        position={position}
        onUpdate={onUpdate}
        dragHandle={job.locked ? {} : { ...attributes, ...listeners }}
      />
    </div>
  );
}

// ── Plan structure elements ───────────────────────────────────────────────────

function DepotMarker({ label, final = false }: { label: string; final?: boolean }) {
  return (
    <div className="flex gap-3 items-start py-0.5 pl-1">
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center">
          <Building2 className="w-3 h-3 text-white" />
        </div>
        {!final && <div className="w-px h-3 bg-gray-300" />}
      </div>
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">{label}</span>
    </div>
  );
}

function DirectConnector() {
  return (
    <div className="flex gap-3 items-start py-0.5 pl-1">
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center">
          <ArrowRight className="w-3 h-3 text-green-600" />
        </div>
        <div className="w-px h-3 bg-green-200" />
      </div>
      <div className="pt-0.5">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">No depot return</p>
        <p className="text-xs text-green-600">Drive directly to next stop</p>
      </div>
    </div>
  );
}

function StepLabel({ kind }: { kind: "convoy" | "split" }) {
  return kind === "convoy" ? (
    <div className="flex items-center gap-1.5 pl-1 pt-1">
      <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
      <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Both drivers</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 pl-1 pt-1">
      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
      <User className="w-3 h-3 text-green-600" />
      <ArrowRight className="w-3 h-3 text-gray-300" />
      <User className="w-3 h-3 text-green-600" />
      <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Drivers split — parallel</span>
    </div>
  );
}

function DriverLabel({ n }: { n: 1 | 2 }) {
  return (
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pl-1">
      Driver {n}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  jobs: Job[];          // pending jobs, sorted
  doneJobs: Job[];
  onUpdate: () => void;
  onReorder: (jobs: Job[]) => void;
}

export default function CombinedJobPlan({ jobs, doneJobs, onUpdate, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const plan = buildTeamPlan(jobs);

  // Ordered job IDs as they appear in the rendered list (matches plan order)
  const orderedIds: string[] = [];
  for (const step of plan) {
    if (step.kind === "convoy") {
      step.stop.jobs.forEach((sj) => orderedIds.push(sj.job.id));
    } else {
      step.driver1.jobs.forEach((sj) => orderedIds.push(sj.job.id));
      step.driver2.jobs.forEach((sj) => orderedIds.push(sj.job.id));
    }
  }

  // Position number per job (based on original sort order, 1-indexed)
  const posMap = new Map(jobs.map((j, i) => [j.id, i + 1]));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Use orderedIds (plan-render order) for positions, not jobs array,
    // because the plan may group jobs differently from the flat jobs array.
    const oldIndex = orderedIds.indexOf(active.id as string);
    const newIndex = orderedIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderedIds = arrayMove(orderedIds, oldIndex, newIndex);
    const jobMap = new Map(jobs.map((j) => [j.id, j]));
    const reordered = newOrderedIds.map((id) => jobMap.get(id)!);

    onReorder(reordered);

    // Always persist every sortOrder to keep DB fully in sync
    await Promise.all(
      reordered.map((job, i) =>
        fetch(`/api/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: i }),
        })
      )
    );
    onUpdate();
  }

  if (jobs.length === 0 && doneJobs.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">

          {jobs.length > 0 && <DepotMarker label="Depart depot" />}

          {plan.map((step, i) => (
            <div key={i} className="space-y-2">
              <StepLabel kind={step.kind} />

              {step.kind === "convoy" ? (
                step.stop.jobs.map((sj) => (
                  <SortableJobCard
                    key={sj.job.id}
                    job={sj.job}
                    position={posMap.get(sj.job.id)!}
                    onUpdate={onUpdate}
                  />
                ))
              ) : (
                <>
                  <DriverLabel n={1} />
                  {step.driver1.jobs.map((sj) => (
                    <SortableJobCard
                      key={sj.job.id}
                      job={sj.job}
                      position={posMap.get(sj.job.id)!}
                      onUpdate={onUpdate}
                    />
                  ))}
                  <DriverLabel n={2} />
                  {step.driver2.jobs.map((sj) => (
                    <SortableJobCard
                      key={sj.job.id}
                      job={sj.job}
                      position={posMap.get(sj.job.id)!}
                      onUpdate={onUpdate}
                    />
                  ))}
                </>
              )}

              {i < plan.length - 1 ? (
                needsDepotReturn(plan, i)
                  ? <DepotMarker label="Return to depot" />
                  : <DirectConnector />
              ) : (
                <DepotMarker label="Return to depot — end of day" final />
              )}
            </div>
          ))}

          {doneJobs.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pl-1">Completed</p>
              {doneJobs.map((job) => (
                <JobCard key={job.id} job={job} onUpdate={onUpdate} />
              ))}
            </div>
          )}

        </div>
      </SortableContext>
    </DndContext>
  );
}
