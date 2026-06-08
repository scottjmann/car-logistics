"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Settings, Route, RefreshCw, Users, ListChecks, LogOut } from "lucide-react";
import Link from "next/link";
import JobCard, { Job } from "@/components/JobCard";
import JobForm from "@/components/JobForm";
import DepotModal from "@/components/DepotModal";
import ImportZone from "@/components/ImportZone";
import TeamPlan from "@/components/TeamPlan";
import dynamic from "next/dynamic";
const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

type View = "team" | "jobs";

export default function OfficePage() {
  const router = useRouter();
  const [date, setDate] = useState(todayStr);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimising, setOptimising] = useState(false);
  const [showDepot, setShowDepot] = useState(false);
  const [view, setView] = useState<View>("team");
  const [depotAddress, setDepotAddress] = useState("");
  const [optimiseError, setOptimiseError] = useState<string | null>(null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/jobs?date=${date}`);
    const data = await res.json();
    setJobs(data);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    fetch("/api/depot")
      .then((r) => r.json())
      .then((d) => { if (d) setDepotAddress(`${d.address}, ${d.postcode}`); });
  }, []);

  async function optimise() {
    setOptimising(true);
    setOptimiseError(null);
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOptimiseError(data.error ?? "Optimisation failed");
    } else {
      setJobs(data.jobs);
    }
    setOptimising(false);
  }

  const pending = jobs.filter((j) => j.status !== "done" && j.status !== "cancelled");
  const done = jobs.filter((j) => j.status === "done");
  const hasJobs = jobs.length > 0;
  const showSideBySide = hasJobs && !!depotAddress;

  function tabClass(t: View) {
    return `flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
      view === t
        ? "bg-gray-900 text-white"
        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
    }`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showDepot && (
        <DepotModal onClose={() => {
          setShowDepot(false);
          fetch("/api/depot").then(r => r.json()).then(d => {
            if (d) setDepotAddress(`${d.address}, ${d.postcode}`);
          });
        }} />
      )}

      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-gray-900 text-lg">Job Sheet</h1>
          <p className="text-xs text-gray-400">Office dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/driver"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50">
            <Route className="w-4 h-4" />
            Driver view
          </Link>
          <button onClick={() => setShowDepot(true)}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={logout}
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            title="Sign out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Use full width when showing side-by-side, otherwise stay narrow */}
      <main className={`mx-auto px-4 py-6 space-y-4 ${showSideBySide ? "max-w-7xl" : "max-w-2xl"}`}>

        {/* Top controls — always full width */}
        <div className="flex items-center gap-3 flex-wrap">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <button onClick={optimise} disabled={optimising || pending.length === 0}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold px-3 py-2 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${optimising ? "animate-spin" : ""}`} />
            {optimising ? "Optimising…" : "Optimise Route"}
          </button>

          <JobForm onCreated={fetchJobs} defaultDate={date} />
        </div>

        <ImportZone onImported={fetchJobs} date={date} />

        {optimiseError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {optimiseError}
          </div>
        )}

        {/* Main content area */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : !hasJobs ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">No jobs for this date</p>
            <p className="text-sm mt-1">Add a job or import a Drivers Diary PDF to get started</p>
          </div>
        ) : (
          <div className={`flex gap-6 items-start ${showSideBySide ? "flex-col lg:flex-row" : ""}`}>

            {/* Left panel — tabs + content */}
            <div className={`space-y-4 ${showSideBySide ? "lg:flex-1 min-w-0" : "w-full"}`}>

              {/* Tabs + stats */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                <button onClick={() => setView("team")} className={tabClass("team")}>
                  <Users className="w-4 h-4" />
                  Team plan
                </button>
                <button onClick={() => setView("jobs")} className={tabClass("jobs")}>
                  <ListChecks className="w-4 h-4" />
                  Job list
                </button>
              </div>

              {/* View content */}
              {view === "team" ? (
                <TeamPlan jobs={pending} />
              ) : (
                <div className="space-y-3">
                  {pending.map((job, i) => (
                    <JobCard key={job.id} job={job} position={i + 1} onUpdate={fetchJobs} />
                  ))}
                  {done.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Completed</p>
                      {done.map((job) => (
                        <JobCard key={job.id} job={job} onUpdate={fetchJobs} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right panel — map, always visible, sticky */}
            {showSideBySide && (
              <div className="w-full lg:w-[480px] xl:w-[560px] flex-shrink-0 lg:sticky lg:top-20">
                <RouteMap jobs={pending} depotAddress={depotAddress} height={600} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
