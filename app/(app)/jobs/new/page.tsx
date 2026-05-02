import { PageHeader } from "@/components/app/page-header"
import { NewJobForm } from "@/components/app/new-job-form"

export default function NewJobPage() {
  return (
    <div>
      <PageHeader title="Post a Job" subtitle="Define a role and start collecting candidates" />
      <NewJobForm />
    </div>
  )
}
