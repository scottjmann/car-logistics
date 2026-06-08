"use client";

import { useState } from "react";
import { Truck, Package, Trash2, CheckCircle, Circle, ChevronDown, ChevronUp, Lock, LockOpen, GripVertical } from "lucide-react";
import UKPlate, { extractReg } from "./UKPlate";
import { getCCAction } from "@/lib/teamPlan";

export interface Job {
  id: string;
  customerName: string;
  address: string;
  postcode: string;
  type: string;
  notes: string | null;
  status: string;
  jobDate: string;
  sortOrder: number;
  locked: boolean;
}

const STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const STATUS_COLOUR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

interface Props {
  job: Job;
  position?: number;
  onUpdate: () => void;
  dragHandle?: React.HTMLAttributes<HTMLDivElement>;
}

export default function JobCard({ job, position, onUpdate, dragHandle }: Props) {
  const [expanded, setExpanded] = useState(false);

  async function cycleStatus() {
    const next = STATUS_CYCLE[job.status] ?? "pending";
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    onUpdate();
  }

  async function deleteJob() {
    if (!confirm(`Delete job for ${job.customerName}?`)) return;
    await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
    onUpdate();
  }

  async function toggleLock() {
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: !job.locked }),
    });
    onUpdate();
  }

  const reg = extractReg(job.notes);
  const ccAction = getCCAction(job);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${job.address}, ${job.postcode}`)}`;
  const isDone = job.status === "done";

  return (
    <div className={`bg-white border rounded-xl shadow-sm transition-opacity ${isDone ? "opacity-60" : ""} ${job.locked ? "border-amber-300 bg-amber-50/30" : ""}`}>
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <div {...dragHandle} className={`flex-shrink-0 mt-1 ${job.locked ? "text-amber-300 cursor-not-allowed" : "text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"}`}>
          <GripVertical className="w-4 h-4" />
        </div>

        {position !== undefined && (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
            {position}
          </span>
        )}

        <div className="flex-shrink-0 mt-0.5">
          {job.type === "delivery" ? (
            <Truck className="w-5 h-5 text-blue-500" />
          ) : (
            <Package className="w-5 h-5 text-purple-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name left, lock badge + status right */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{job.customerName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{job.address}, {job.postcode}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {job.locked && (
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOUR[job.status]}`}>
                {STATUS_LABEL[job.status]}
              </span>
            </div>
          </div>

          {/* Type + CC badge + plate + navigate */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.type === "delivery" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {job.type === "delivery" ? "Delivery" : "Collection"}
            </span>

            {ccAction === "deliver" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                + Drop CC
              </span>
            )}
            {ccAction === "collect" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                + Collect CC
              </span>
            )}

            {reg && <UKPlate reg={reg} />}

            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline ml-auto">
              Navigate
            </a>

            {job.notes && (
              <button onClick={() => setExpanded((x) => !x)} className="text-gray-400 hover:text-gray-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {expanded && job.notes && (
            <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{job.notes}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button onClick={cycleStatus} title="Cycle status" className="text-gray-400 hover:text-green-600">
            {isDone ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5" />}
          </button>
          <button onClick={toggleLock} title={job.locked ? "Unlock" : "Lock position"} className={job.locked ? "text-amber-500 hover:text-amber-700" : "text-gray-300 hover:text-amber-500"}>
            {job.locked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
          </button>
          <button onClick={deleteJob} title="Delete job" className="text-gray-300 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
