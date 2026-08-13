'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, ShieldCheck, LayoutDashboard, Users, 
  Calendar, Bell, LineChart, LogOut, Menu, X, ArrowLeft,
  ChevronRight, Award
} from 'lucide-react'
import { MOCK_USER } from '@/lib/constants'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const adminItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Manage Members', href: '/admin/members', icon: Users },
  { label: 'Manage Events', href: '/admin/events', icon: Calendar },
  { label: 'System Analytics', href: '/admin/analytics', icon: LineChart },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-zinc-950 text-zinc-100 border-r border-zinc-800 select-none">
      {/* Brand */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-white tracking-tight leading-none">ANX Control</span>
              <span className="text-[9px] text-amber-500 font-semibold uppercase tracking-wider mt-0.5">Admin Console</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-zinc-900 text-zinc-400 lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {adminItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                isActive 
                  ? "text-amber-500 bg-amber-500/10" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeAdminIndicator"
                  className="absolute left-0 w-1 h-6 rounded-r-full bg-amber-500"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? "text-amber-500" : "text-zinc-400 group-hover:text-white"}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-900/30">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <img
            src={MOCK_USER.avatar}
            alt={MOCK_USER.fullName}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-zinc-800"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{MOCK_USER.fullName}</h4>
            <p className="text-xs text-zinc-500 truncate">System Operator</p>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold rounded-xl text-xs transition-colors border border-zinc-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Desktop Sidebar */}
      <aside className="w-72 h-full shrink-0 hidden lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-45 bg-black lg:hidden"
            />
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed top-0 bottom-0 left-0 z-50 w-72 bg-zinc-950 shadow-2xl lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl select-none">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase">
                Staff Control
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Ecosystem Operator Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2.5 p-1.5 pr-3 bg-muted/40 border border-border/40 rounded-xl">
              <img
                src={MOCK_USER.avatar}
                alt={MOCK_USER.fullName}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <span className="text-xs font-bold text-foreground hidden sm:inline">{MOCK_USER.fullName}</span>
            </div>
          </div>
        </header>

        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-background/30 relative">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 pb-16"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
