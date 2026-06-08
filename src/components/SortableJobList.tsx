"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import JobCard, { Job } from "./JobCard";

function SortableJobCard({
  job,
  position,
  onUpdate,
}: {
  job: Job;
  position: number;
  onUpdate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id, disabled: job.locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <JobCard
        job={job}
        position={position}
        onUpdate={onUpdate}
        dragHandle={job.locked ? {} : { ...attributes, ...listeners }}
      />
    </div>
  );
}

interface Props {
  jobs: Job[];
  onUpdate: () => void;
  onReorder: (jobs: Job[]) => void;
}

export default function SortableJobList({ jobs, onUpdate, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = jobs.findIndex((j) => j.id === active.id);
    const newIndex = jobs.findIndex((j) => j.id === over.id);
    const reordered = arrayMove(jobs, oldIndex, newIndex);

    onReorder(reordered);

    // Persist new sort order — only update jobs whose position changed
    await Promise.all(
      reordered.map((job, i) =>
        job.sortOrder !== i
          ? fetch(`/api/jobs/${job.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder: i }),
            })
          : null
      )
    );

    onUpdate();
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <SortableJobCard key={job.id} job={job} position={i + 1} onUpdate={onUpdate} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
