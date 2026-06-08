"use client";

import { Users, User, Truck, Package, ArrowRight, Trash2, Building2 } from "lucide-react";
import { Job } from "./JobCard";
import UKPlate, { extractReg } from "./UKPlate";
import { buildTeamPlan, convoyDescription, soloDescription, needsDepotReturn, PlanStep, Stop } from "@/lib/teamPlan";

interface Props {
  jobs: Job[];
  onJobDeleted: () => void;
}

function jobIcon(type: string) {
  return type === "delivery"
    ? <Truck className="w-3.5 h-3.5 inline-block mr-1 text-blue-500" />
    : <Package className="w-3.5 h-3.5 inline-block mr-1 text-purple-500" />;
}

async function deleteJob(id: string, name: string, onDone: () => void) {
  if (!confirm(`Delete job for ${name}?`)) return;
  await fetch(`/api/jobs/${id}`, { method: "DELETE" });
  onDone();
}

function StopCard({ stop, label, onJobDeleted }: { stop: Stop; label?: string; onJobDeleted: () => void }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 p-3 space-y-1.5">
      {label && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>}
      <p className="font-semibold text-gray-800 text-sm leading-tight">
        {stop.jobs[0].job.customerName}
        {stop.jobs.length > 1 && (
          <span className="ml-1.5 text-xs font-normal text-gray-400">+{stop.jobs.length - 1} more</span>
        )}
      </p>
      <p className="text-xs text-gray-500">{stop.address}, {stop.postcode}</p>
      {stop.jobs.map((sj, i) => {
        const reg = extractReg(sj.job.notes);
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {jobIcon(sj.job.type)}
              <span className={`text-sm font-semibold capitalize ${sj.job.type === "delivery" ? "text-blue-700" : "text-purple-700"}`}>
                {sj.job.type}
              </span>
              {sj.ccAction === "deliver" && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  + Drop CC
                </span>
              )}
              {sj.ccAction === "collect" && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                  + Collect CC
                </span>
              )}
              {reg && <UKPlate reg={reg} size="sm" />}
              <button
                onClick={() => deleteJob(sj.job.id, sj.job.customerName, onJobDeleted)}
                className="text-gray-300 hover:text-red-500 ml-auto"
                title="Delete job"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 pl-5">{soloDescription(sj)}</p>
          </div>
        );
      })}
    </div>
  );
}

function DepotMarker({ label, final = false }: { label: string; final?: boolean }) {
  return (
    <div className="flex gap-3 items-start py-1">
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-3.5 h-3.5 text-white" />
        </div>
        {!final && <div className="w-0.5 h-4 bg-gray-200" />}
      </div>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1.5">{label}</span>
    </div>
  );
}

function DirectConnector() {
  return (
    <div className="flex gap-3 items-start py-1">
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center flex-shrink-0">
          <ArrowRight className="w-3.5 h-3.5 text-green-600" />
        </div>
        <div className="w-0.5 h-4 bg-green-200" />
      </div>
      <div className="pt-1">
        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">No depot return needed</span>
        <p className="text-xs text-green-600 mt-0.5">Drive directly to the next stop</p>
      </div>
    </div>
  );
}

function ConvoyStep({ stop, stepNumber, onJobDeleted }: { stop: Stop; stepNumber: number; onJobDeleted: () => void }) {
  const netBalance = stop.jobs.filter(s => s.job.type === "collection").length
    - stop.jobs.filter(s => s.job.type === "delivery").length;

  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
        <div className="w-7 h-7 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-xs font-bold text-orange-700">
          {stepNumber}
        </div>
        <div className="w-0.5 h-4 bg-gray-200" />
      </div>

      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
            Both drivers — Convoy stop
          </span>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
          {/* Header: name + address only */}
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {stop.jobs[0].job.customerName}
              {stop.jobs.length > 1 && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">({stop.jobs.length} jobs here)</span>
              )}
            </p>
            <p className="text-xs text-gray-500">{stop.address}, {stop.postcode}</p>
          </div>

          {/* Job rows: type + CC badge + plate + delete */}
          {stop.jobs.map((sj, i) => {
            const reg = extractReg(sj.job.notes);
            return (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                  {jobIcon(sj.job.type)}
                  <span className={`text-sm font-semibold capitalize ${sj.job.type === "delivery" ? "text-blue-700" : "text-purple-700"}`}>
                    {sj.job.type}
                  </span>
                  {sj.ccAction === "deliver" && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      + Drop CC
                    </span>
                  )}
                  {sj.ccAction === "collect" && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                      + Collect CC
                    </span>
                  )}
                  {reg && <UKPlate reg={reg} size="md" />}
                </div>
                <button
                  onClick={() => deleteJob(sj.job.id, sj.job.customerName, onJobDeleted)}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0"
                  title="Delete job"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          <p className="text-xs text-gray-500 pt-1 border-t border-orange-100">
            {convoyDescription(stop)}
            {netBalance > 0 && ` · Driver 2 follows for return transport — drives company car back`}
            {netBalance < 0 && ` · Driver 2 follows to pick up Driver 1 after drop-off`}
            {netBalance === 0 && ` · Each driver takes one car back`}
          </p>
        </div>
      </div>
    </div>
  );
}

function SplitStep({ step, stepNumber, onJobDeleted }: { step: Extract<PlanStep, { kind: "split" }>; stepNumber: number; onJobDeleted: () => void }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
        <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center text-xs font-bold text-green-700">
          {stepNumber}
        </div>
        <div className="w-0.5 h-4 bg-gray-200" />
      </div>

      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-green-600 flex-shrink-0" />
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <User className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Drivers split — work in parallel
          </span>
        </div>

        <div className="flex gap-2">
          <StopCard stop={step.driver1} label="Driver 1" onJobDeleted={onJobDeleted} />
          <StopCard stop={step.driver2} label="Driver 2" onJobDeleted={onJobDeleted} />
        </div>
      </div>
    </div>
  );
}

export default function TeamPlan({ jobs, onJobDeleted }: Props) {
  const plan = buildTeamPlan(jobs);
  const convoyCount = plan.filter((s) => s.kind === "convoy").length;
  const splitCount = plan.filter((s) => s.kind === "split").length;
  const totalStops = plan.reduce((n, s) => n + (s.kind === "convoy" ? 1 : 2), 0);

  if (plan.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">No active jobs to plan</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-400" />
          <span className="text-gray-600">
            {convoyCount} convoy stop{convoyCount !== 1 ? "s" : ""} — both drivers together
          </span>
        </div>
        {splitCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">
              {splitCount} split — {splitCount * 2} jobs done in parallel
            </span>
          </div>
        )}
        <span className="text-gray-400">{totalStops} locations total</span>
      </div>

      {splitCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          No jobs today have a courtesy car exchange — all stops require both drivers to travel together.
        </div>
      )}

      <div className="space-y-0">
        <DepotMarker label="Depart depot" />

        {plan.map((step, i) => (
          <div key={i}>
            {step.kind === "convoy" ? (
              <ConvoyStep stop={step.stop} stepNumber={i + 1} onJobDeleted={onJobDeleted} />
            ) : (
              <SplitStep step={step} stepNumber={i + 1} onJobDeleted={onJobDeleted} />
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
      </div>
    </div>
  );
}
