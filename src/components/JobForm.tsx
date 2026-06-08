"use client";

import { useState } from "react";

interface Props {
  onCreated: () => void;
  defaultDate: string;
}

export default function JobForm({ onCreated, defaultDate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    address: "",
    postcode: "",
    type: "collection",
    notes: "",
    jobDate: defaultDate,
  });

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setForm({ customerName: "", address: "", postcode: "", type: "collection", notes: "", jobDate: defaultDate });
    setOpen(false);
    onCreated();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"
      >
        + Add Job
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
      <h2 className="font-semibold text-gray-800">New Job</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Customer name</label>
          <input required value={form.customerName} onChange={field("customerName")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
          <input required value={form.address} onChange={field("address")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Postcode</label>
          <input required value={form.postcode} onChange={field("postcode")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select value={form.type} onChange={field("type")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="collection">Collection</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input type="date" required value={form.jobDate} onChange={field("jobDate")}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
          <textarea value={form.notes} onChange={field("notes")} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm">
          {loading ? "Saving…" : "Save Job"}
        </button>
      </div>
    </form>
  );
}
