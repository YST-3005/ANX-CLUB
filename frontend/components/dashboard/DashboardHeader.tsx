'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, Bell, Sun, Moon, LogOut, User, Settings, Check, Sparkles, Award } from 'lucide-react'
import { MOCK_USER, MOCK_ANNOUNCEMENTS } from '@/frontend/lib/constants'
import { ThemeToggle } from '@/frontend/components/ui/theme-toggle'

interface HeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export function DashboardHeader({ onMenuClick }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-border/10 bg-background/60 backdrop-blur-2xl select-none shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      {/* Search / Collapsible Trigger */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative max-w-md w-full hidden md:block group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search events, mentors, projects, roadmaps..."
            className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/10 rounded-full text-sm placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:bg-black/50 transition-all text-white shadow-inner"
          />
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileMenu(false)
            }}
            className="relative p-2.5 rounded-xl border border-border/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-80 glass border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] z-20 py-2 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">Recent Activity</span>
                    <button className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                    {MOCK_ANNOUNCEMENTS.slice(0, 3).map((ann) => (
                      <div key={ann.id} className="p-3.5 hover:bg-muted/30 transition-colors flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{ann.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{ann.content}</p>
                          <span className="text-[9px] text-muted-foreground mt-2 block font-medium">Just now</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/announcements"
                    onClick={() => setShowNotifications(false)}
                    className="block text-center text-xs font-semibold text-primary py-2.5 border-t border-white/10 bg-black/20 hover:bg-black/40 transition-colors"
                  >
                    View All Announcements
                  </Link>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2 p-1.5 pr-3.5 rounded-full border border-border/10 bg-black/20 hover:bg-black/40 transition-all text-left"
          >
            <img
              src={MOCK_USER.avatar}
              alt={MOCK_USER.fullName}
              className="w-7.5 h-7.5 rounded-full object-cover ring-2 ring-primary/30"
            />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground truncate max-w-[100px] leading-tight">{MOCK_USER.fullName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-muted-foreground font-medium truncate">{MOCK_USER.college}</span>
              </div>
            </div>
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-56 glass border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] z-20 p-1.5 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs text-muted-foreground font-medium">Signed in as</p>
                    <p className="text-sm font-semibold text-foreground truncate mt-0.5">{MOCK_USER.fullName}</p>
                    {MOCK_USER.membershipTier === 'premium' && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase mt-1.5">
                        <Award className="w-2.5 h-2.5" /> Premium Member
                      </span>
                    )}
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/profile#settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Account Settings</span>
                  </Link>

                  <div className="border-t border-white/10 my-1" />

                  <Link
                    href="/"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </Link>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
