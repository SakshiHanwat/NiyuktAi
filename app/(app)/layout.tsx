import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/app/sidebar"
import { TopBar } from "@/components/app/topbar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-60">
        <TopBar />
        <main className="px-6 py-8 md:px-8 md:py-10 max-w-7xl mx-auto animate-fade-up">
          {children}
        </main>
      </div>
    </div>
  )
}
