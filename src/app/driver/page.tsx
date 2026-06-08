"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, Truck, Package, CheckCircle, Circle, MapPin, Map } from "lucide-react";
import Link from "next/link";
import { Job } from "@/components/JobCard";
import dynamic from "next/dynamic";
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const STATUS_CYCLE: Record<string, string> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

export default function DriverPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [depotAddress, setDepotAddress] = useState("");
  const date = todayStr();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/jobs?date=${date}`);
    const data = await res.json();
    setJobs(data.filter((j: Job) => j.status !== "cancelled"));
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    fetch("/api/depot").then((r) => r.json()).then((d) => {
      if (d) setDepotAddress(`${d.address}, ${d.postcode}`);
    });
  }, []);

  async function cycleStatus(job: Job) {
    const next = STATUS_CYCLE[job.status] ?? "pending";
    await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    fetchJobs();
  }

  const pending = jobs.filter((j) => j.status !== "done");
  const done = jobs.filter((j) => j.status === "done");
  const allDone = pending.length === 0 && jobs.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="px-4 py-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-white">Today&apos;s Route</h1>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {depotAddress && (
            <button onClick={() => setShowMap((v) => !v)}
              className={`p-2 rounded-lg transition-colors ${showMap ? "text-blue-400 bg-blue-950" : "text-gray-400 hover:text-white"}`}>
              <Map className="w-5 h-5" />
            </button>
          )}
          <button onClick={fetchJobs} className="text-gray-400 hover:text-white p-2">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {showMap && depotAddress && (
          <RouteMap jobs={pending} depotAddress={depotAddress} />
        )}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No jobs today</p>
          </div>
        ) : allDone ? (
          <div className="text-center py-12">
            <p className="text-2xl font-bold text-green-400">All done!</p>
            <p className="text-gray-400 mt-2">Great work today.</p>
          </div>
        ) : null}

        {/* Active stops */}
        {pending.map((job, i) => {
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${job.address}, ${job.postcode}`)}`;
          const isInProgress = job.status === "in_progress";

          return (
            <div key={job.id}
              className={`rounded-2xl p-4 border transition-all ${isInProgress ? "bg-amber-950 border-amber-700" : "bg-gray-900 border-gray-800"}`}>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {job.type === "delivery"
                      ? <Truck className="w-4 h-4 text-blue-400" />
                      : <Package className="w-4 h-4 text-purple-400" />}
                    <span className={`text-xs font-medium ${job.type === "delivery" ? "text-blue-400" : "text-purple-400"}`}>
                      {job.type === "delivery" ? "Delivery" : "Collection"}
                    </span>
                    {isInProgress && <span className="text-xs text-amber-400 font-medium">· In progress</span>}
                  </div>

                  <p className="font-semibold text-white mt-1">{job.customerName}</p>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <p className="text-sm text-gray-400">{job.address}, {job.postcode}</p>
                  </div>

                  {job.notes && (
                    <p className="mt-2 text-xs text-gray-500 bg-gray-800 rounded-lg p-2">{job.notes}</p>
                  )}

                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-blue-400 font-medium hover:text-blue-300 underline underline-offset-2">
                    Open in Google Maps
                  </a>
                </div>

                <button onClick={() => cycleStatus(job)}
                  className="flex-shrink-0 text-gray-500 hover:text-green-400 mt-1">
                  <Circle className="w-6 h-6" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Completed stops */}
        {done.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-wide font-medium pt-2">Completed</p>
            {done.map((job) => (
              <div key={job.id} className="rounded-xl px-4 py-3 bg-gray-900 border border-gray-800 opacity-50 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-300 line-through">{job.customerName}</p>
                  <p className="text-xs text-gray-600">{job.address}, {job.postcode}</p>
                </div>
                <button onClick={() => cycleStatus(job)} className="text-gray-700 hover:text-gray-400 text-xs">
                  Undo
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
