"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  Briefcase,
  Users,
  Workflow,
  Upload,
  GitCompareArrows,
  Mail,
  ShieldCheck,
  Bot,
  Settings,
  LogOut,
} from "lucide-react"

type Item = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }

const WORKSPACE: Item[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Candidates", href: "/candidates", icon: Users },
  { label: "Pipeline", href: "/pipeline", icon: Workflow },
]

const AI_TOOLS: Item[] = [
  { label: "Resume Upload", href: "/upload", icon: Upload },
  { label: "Compare", href: "/compare", icon: GitCompareArrows },
  { label: "Email Assistant", href: "/emails", icon: Mail },
  { label: "Bias Audit", href: "/bias", icon: ShieldCheck },
  { label: "Agents", href: "/agents", icon: Bot },
]

const ACCOUNT: Item[] = [{ label: "Settings", href: "/settings", icon: Settings }]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border z-30">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-0 text-lg font-semibold tracking-tight">
          <span className="text-foreground">NIYUKT</span>
          <span className="text-muted-foreground">Ai</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-6">
        <NavSection label="Workspace" items={WORKSPACE} pathname={pathname} isActive={isActive} />
        <NavSection label="AI Tools" items={AI_TOOLS} pathname={pathname} isActive={isActive} />
        <NavSection label="Account" items={ACCOUNT} pathname={pathname} isActive={isActive} />
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

function NavSection({
  label,
  items,
  pathname: _pathname,
  isActive,
}: {
  label: string
  items: Item[]
  pathname: string
  isActive: (href: string) => boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="px-3 mb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
