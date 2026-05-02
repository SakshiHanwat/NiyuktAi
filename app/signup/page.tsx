import { AuthForm } from "@/components/auth/auth-form"
import { DotGrid } from "@/components/auth/dot-grid"

export default function SignUpPage() {
  return (
    <main className="relative min-h-screen w-full bg-background flex items-center justify-center px-6 py-12 overflow-hidden">
      <DotGrid />
      <div className="relative z-10 w-full flex justify-center">
        <AuthForm defaultMode="signup" />
      </div>
    </main>
  )
}
