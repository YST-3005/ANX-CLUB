'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  Sparkles, LayoutDashboard, Calendar, Users, 
  Award, Bell, BookOpen, User, ShieldAlert, LogOut, X, MessageSquare 
} from 'lucide-react'
import { MOCK_USER } from '@/frontend/lib/constants'
import { cn } from '@/frontend/lib/utils'

interface SidebarProps {
  onClose?: () => void
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Events', href: '/events', icon: Calendar },
  { label: 'Mentors', href: '/mentors', icon: Users },
  { label: 'Resources', href: '/resources', icon: BookOpen },
  { label: 'Community', href: '/community', icon: MessageSquare },
  { label: 'Announcements', href: '/announcements', icon: Bell },
  { label: 'Membership', href: '/membership', icon: Award },
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'Admin Hub', href: '/admin', icon: ShieldAlert },
]

export function DashboardSidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col justify-between bg-background text-foreground border-r border-border/10 select-none z-10 relative">
      {/* Decorative light glow for sidebar */}
      <div className="absolute top-0 left-[-50%] w-full h-96 bg-fuchsia-600/5 blur-[120px] rounded-full pointer-events-none" />
      {/* Top Brand Block */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-foreground tracking-tight leading-none">A.N.X</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Club Ecosystem</span>
            </div>
          </Link>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground lg:hidden">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group z-10",
                isActive 
                  ? "text-primary bg-primary/10 shadow-[0_0_15px_rgba(217,70,239,0.05)] border border-primary/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeSidebarIndicator"
                  className="absolute left-0 w-1 h-6 rounded-r-full bg-primary shadow-[0_0_10px_rgba(217,70,239,0.8)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-105", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span>{item.label}</span>
              {item.href === '/admin' && (
                <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase">
                  Staff
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Profile Card & Logout Footer */}
      <div className="p-4 border-t border-border/10 bg-black/20 z-10">
        <div className="flex items-center gap-3 p-2 rounded-xl">
          <img
            src={MOCK_USER.avatar}
            alt={MOCK_USER.fullName}
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-border/50"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{MOCK_USER.fullName}</h4>
            <p className="text-xs text-muted-foreground truncate">{MOCK_USER.email}</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 mt-3 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/5 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Link>
      </div>
    </div>
  )
}
