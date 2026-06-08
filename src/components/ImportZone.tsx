"use client";

import { useRef, useState, DragEvent } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";

interface ImportResult {
  count: number;
  jobs: { customerName: string; type: string }[];
}

interface Props {
  onImported: () => void;
  date: string; // YYYY-MM-DD — jobs will be imported under this date
}

type State =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "uploading" }
  | { status: "success"; result: ImportResult }
  | { status: "error"; message: string };

export default function ImportZone({ onImported, date }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".pdf")) {
      setState({ status: "error", message: "Only PDF files are supported." });
      return;
    }

    setState({ status: "uploading" });

    const form = new FormData();
    form.append("file", file);
    form.append("date", date);

    const res = await fetch("/api/import", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setState({ status: "error", message: data.error ?? `Import failed (${res.status})` });
      return;
    }

    setState({ status: "success", result: data });
    onImported();
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
    else setState({ status: "idle" });
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setState({ status: "dragging" });
  }

  function onDragLeave() {
    setState((s) => (s.status === "dragging" ? { status: "idle" } : s));
  }

  function reset() {
    setState({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  const isDragging = state.status === "dragging";
  const isUploading = state.status === "uploading";
  const isSuccess = state.status === "success";
  const isError = state.status === "error";

  if (isSuccess) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800">
            {state.result.count} job{state.result.count !== 1 ? "s" : ""} imported
          </p>
          <p className="text-xs text-green-600 mt-0.5 truncate">
            {state.result.jobs.map((j) => j.customerName).join(", ")}
          </p>
        </div>
        <button onClick={reset} className="text-green-500 hover:text-green-700 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm text-red-700 flex-1">{state.message}</p>
        <button onClick={reset} className="text-red-400 hover:text-red-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors
        ${isDragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {isUploading ? (
        <>
          <FileText className="w-5 h-5 text-blue-500 animate-pulse flex-shrink-0" />
          <p className="text-sm text-gray-600">Reading diary…</p>
        </>
      ) : (
        <>
          <Upload className={`w-5 h-5 flex-shrink-0 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
          <div>
            <p className={`text-sm font-medium ${isDragging ? "text-blue-700" : "text-gray-600"}`}>
              {isDragging ? "Drop to import" : "Import Drivers Diary"}
            </p>
            <p className="text-xs text-gray-400">Drag & drop a PDF or click to browse</p>
          </div>
        </>
      )}
    </div>
  );
}
