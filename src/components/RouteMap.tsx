"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Job } from "./JobCard";

interface Props {
  jobs: Job[];
  depotAddress: string;
  height?: number;
}

let optionsSet = false;
function ensureOptions() {
  if (!optionsSet) {
    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!, v: "weekly" });
    optionsSet = true;
  }
}

function stopColour(type: string) {
  return type === "delivery" ? "#2563eb" : "#7c3aed";
}

export default function RouteMap({ jobs, depotAddress, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "empty">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const pending = jobs.filter((j) => j.status !== "done" && j.status !== "cancelled");
    if (pending.length === 0) { setStatus("empty"); return; }

    setStatus("loading");
    let cancelled = false;

    async function init() {
      try {
        ensureOptions();
        const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;
        const { DirectionsService, DirectionsRenderer, TravelMode } =
          await importLibrary("routes") as google.maps.RoutesLibrary;

        if (cancelled || !containerRef.current) return;

        const map = new Map(containerRef.current, {
          zoom: 10,
          center: { lat: 51.75, lng: 0.0 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const renderer = new DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#3b82f6",
            strokeWeight: 5,
            strokeOpacity: 0.8,
          },
        });

        const result = await new DirectionsService().route({
          origin: `${depotAddress}, UK`,
          destination: `${depotAddress}, UK`,
          waypoints: pending.map((j) => ({
            location: `${j.address}, ${j.postcode}, UK`,
            stopover: true,
          })),
          travelMode: TravelMode.DRIVING,
        });

        if (cancelled) return;
        renderer.setDirections(result);

        const legs = result.routes[0].legs;

        // Depot marker
        new google.maps.Marker({
          map,
          position: legs[0].start_location,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: "#111827",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2.5,
            scale: 14,
          },
          label: { text: "D", color: "#ffffff", fontWeight: "bold", fontSize: "11px" },
          title: "Depot",
          zIndex: 10,
        });

        // Numbered stop markers
        pending.forEach((job, i) => {
          new google.maps.Marker({
            map,
            position: legs[i].end_location,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: stopColour(job.type),
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 13,
            },
            label: { text: String(i + 1), color: "#ffffff", fontWeight: "bold", fontSize: "11px" },
            title: `${i + 1}. ${job.customerName} — ${job.type}`,
            zIndex: 5,
          });
        });

        if (!cancelled) setStatus("ok");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Map failed to load");
          setStatus("error");
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [jobs, depotAddress]);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 relative" style={{ height }}>
      {status === "loading" && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <p className="text-gray-400 text-sm">Loading map…</p>
        </div>
      )}
      {status === "empty" && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <p className="text-gray-400 text-sm">No active stops to map</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 p-4">
          <p className="text-red-600 text-sm text-center">{errorMsg}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
