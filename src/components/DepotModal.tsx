"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

interface Depot {
  address: string;
  postcode: string;
}

interface Props {
  onClose: () => void;
}

export default function DepotModal({ onClose }: Props) {
  const [depot, setDepot] = useState<Depot>({ address: "", postcode: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/depot").then((r) => r.json()).then((d) => {
      if (d) setDepot({ address: d.address, postcode: d.postcode });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/depot", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(depot),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Depot / Start address</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-gray-500 mb-4">This is where the driver starts and returns to. Used for route optimisation.</p>

        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <input required value={depot.address} onChange={(e) => setDepot((d) => ({ ...d, address: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Postcode</label>
            <input required value={depot.postcode} onChange={(e) => setDepot((d) => ({ ...d, postcode: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm">
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
