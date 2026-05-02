"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/app/primitives"

export function NewJobForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("")
  const [experience, setExperience] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("You must be signed in to post a job.")
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase.from("jobs").insert({
        user_id: user.id,
        title: title.trim(),
        department: department.trim() || null,
        location: location.trim() || null,
        job_type: jobType || null,
        experience_required: experience.trim() || null,
        description: description.trim() || null,
        status: "active",
      })

      if (insertError) throw insertError

      router.push("/jobs")
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not create job"
      setError(message)
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField label="Job title" required>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="e.g. Senior Frontend Engineer"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Department">
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="form-input"
              placeholder="e.g. Engineering"
            />
          </FormField>

          <FormField label="Location">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
              placeholder="e.g. Remote / Bengaluru"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Job type">
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="form-input"
            >
              <option value="">Select type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </FormField>

          <FormField label="Experience required">
            <input
              type="text"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="form-input"
              placeholder="e.g. 3-5 years"
            />
          </FormField>
        </div>

        <FormField label="Job description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            className="form-input resize-y"
            placeholder="Responsibilities, required skills, what success looks like..."
          />
        </FormField>

        {error && (
          <div className="text-xs font-mono text-foreground bg-muted border border-border rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create job"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-border text-foreground px-5 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <style>{`
        .form-input {
          background: var(--input);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          width: 100%;
          transition: border-color 0.15s;
          font-family: var(--font-sans);
        }
        .form-input::placeholder { color: var(--muted-foreground); }
        .form-input:focus { outline: none; border-color: var(--foreground); }
      `}</style>
    </Card>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-foreground"> *</span>}
      </span>
      {children}
    </label>
  )
}
