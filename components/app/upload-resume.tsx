"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/app/primitives"
import { FileText, Upload as UploadIcon, Check } from "lucide-react"

type Job = { id: string; title: string; department: string | null }

type Step = "uploading" | "parsing" | "analyzing" | "done"
const STEPS: { key: Step; label: string }[] = [
  { key: "uploading", label: "Uploading..." },
  { key: "parsing", label: "Parsing PDF..." },
  { key: "analyzing", label: "Agent analyzing..." },
  { key: "done", label: "Decision made" },
]

type Result = {
  candidate_id?: string
  name?: string
  score?: number
  decision?: string
}

export function UploadResume({ jobs }: { jobs: Job[] }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [jobId, setJobId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [step, setStep] = useState<Step | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (f: File | null) => {
    if (!f) return
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.")
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose a PDF first.")
      return
    }
    setError(null)
    setResult(null)
    setStep("uploading")

    try {
      const fd = new FormData()
      fd.append("resume", file)
      if (jobId) fd.append("job_id", jobId)

      // Optimistic step animation while the request is in flight
      const stepTimer = setTimeout(() => setStep("parsing"), 800)
      const stepTimer2 = setTimeout(() => setStep("analyzing"), 1800)

      const res = await fetch("/api/upload-resume", {
        method: "POST",
        body: fd,
      })

      clearTimeout(stepTimer)
      clearTimeout(stepTimer2)

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`)
      }

     const data = await res.json().catch(() => ({}))
setStep("done")
setResult({
  candidate_id: data.candidate?.id,
  name: data.candidate?.name ?? data.parsed?.name,
  score: data.candidate?.score,
  decision: data.candidate?.score >= 70 ? "shortlist" : data.candidate?.score >= 50 ? "hold" : "reject",
})
    } catch (err: unknown) {
      setStep(null)
      setError(err instanceof Error ? err.message : "Upload failed")
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setStep(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const stepIndex = step ? STEPS.findIndex((s) => s.key === step) : -1

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="flex flex-col gap-6">
        {/* Job selector */}
        <Card className="p-5">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Target job (optional)
          </label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="w-full bg-input border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
          >
            <option value="" className="bg-card">
              No specific job
            </option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id} className="bg-card text-foreground">
                {j.title}
                {j.department ? ` · ${j.department}` : ""}
              </option>
            ))}
          </select>
        </Card>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files?.[0] ?? null)
          }}
          className={`bg-card border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragOver ? "border-foreground bg-muted/30" : "border-border"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center">
              {file ? (
                <FileText className="w-5 h-5 text-foreground" />
              ) : (
                <UploadIcon className="w-5 h-5 text-foreground" />
              )}
            </div>
            {file ? (
              <>
                <p className="text-sm text-foreground font-medium">{file.name}</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground font-medium">Drop a PDF resume here</p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  or click below to browse files
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="border border-border text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
              >
                {file ? "Change file" : "Browse files"}
              </button>
              {file && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={step !== null && step !== "done"}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {step === null ? "Run agent" : "Running..."}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs font-mono text-foreground bg-card border border-border rounded-md px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Right column — progress + result */}
      <div className="flex flex-col gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Agent steps</h3>
          <ol className="flex flex-col gap-3">
            {STEPS.map((s, idx) => {
              const isActive = step === s.key
              const isComplete = stepIndex > idx || step === "done"
              return (
                <li key={s.key} className="flex items-center gap-3 text-xs font-mono">
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                      isComplete
                        ? "bg-foreground border-foreground text-background"
                        : isActive
                          ? "border-foreground text-foreground"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span
                    className={
                      isActive
                        ? "text-foreground"
                        : isComplete
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }
                  >
                    {s.label}
                  </span>
                  {isActive && (
                    <span className="ml-auto inline-flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-foreground animate-pulse" />
                      <span className="w-1 h-1 rounded-full bg-foreground animate-pulse [animation-delay:0.2s]" />
                      <span className="w-1 h-1 rounded-full bg-foreground animate-pulse [animation-delay:0.4s]" />
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </Card>

        {result && step === "done" && (
          <Card className="p-5 animate-fade-up">
            <h3 className="text-sm font-medium text-foreground mb-4">Result</h3>
            <div className="flex flex-col gap-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="text-foreground">{result.name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Score</span>
                <span className="text-foreground">{result.score ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Decision</span>
                <span className="text-foreground uppercase tracking-wider">
                  {result.decision ?? "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              {result.candidate_id && (
                <Link
                  href={`/candidates/${result.candidate_id}`}
                  className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  View candidate
                </Link>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="border border-border text-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-muted transition-colors"
              >
                Upload another
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
