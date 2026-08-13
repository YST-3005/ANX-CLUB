'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Search, Bell, Sun, Moon, LogOut, User, Settings, Check, Sparkles, Award, Zap, Bot } from 'lucide-react'
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-white/5 bg-[#0b0c1b]/80 backdrop-blur-md select-none shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
      {/* Search / Collapsible Trigger */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative max-w-md w-full hidden md:block group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-purple-400 transition-colors" />
          <input
            type="text"
            placeholder="Search events, mentors, projects, roadmaps..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 focus:bg-white/10 transition-all text-white shadow-inner"
          />
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-4">
        
        {/* XP Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400">
          <Zap className="w-4 h-4 fill-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <span className="text-xs font-bold">1280 XP</span>
        </div>

        {/* Bot Icon */}
        <button className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-purple-500/20 hover:border-purple-500/30 text-purple-400 transition-all relative overflow-hidden group">
          <div className="absolute inset-0 bg-purple-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Bot className="w-5 h-5 relative z-10 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowProfileMenu(false)
            }}
            className="relative p-2 rounded-full border border-white/10 bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/30 text-rose-400 transition-all"
          >
            <Bell className="w-5 h-5 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0b0c1b]" />
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
                  className="absolute right-0 mt-3 w-80 glass-card rounded-2xl z-20 py-2 overflow-hidden"
                >
                  <div className="px-4 py-2.5 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">Recent Activity</span>
                    <button className="text-[10px] text-purple-400 font-semibold hover:underline flex items-center gap-1">
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                    {MOCK_ANNOUNCEMENTS.slice(0, 3).map((ann) => (
                      <div key={ann.id} className="p-3.5 hover:bg-white/5 transition-colors flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        <div>
                          <p className="text-xs font-semibold text-white line-clamp-1">{ann.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{ann.content}</p>
                          <span className="text-[9px] text-muted-foreground mt-2 block font-medium">Just now</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/announcements"
                    onClick={() => setShowNotifications(false)}
                    className="block text-center text-xs font-semibold text-purple-400 py-2.5 border-t border-white/10 bg-black/20 hover:bg-black/40 transition-colors"
                  >
                    View All Announcements
                  </Link>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative ml-2">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifications(false)
            }}
            className="flex items-center gap-3 text-left group"
          >
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-semibold text-white leading-tight group-hover:text-purple-400 transition-colors">{MOCK_USER.fullName}</p>
              <span className="text-[10px] text-purple-400 font-medium truncate">Premium Member</span>
            </div>
            <img
              src={MOCK_USER.avatar}
              alt={MOCK_USER.fullName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            />
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
                  className="absolute right-0 mt-3 w-56 glass-card rounded-2xl z-20 p-1.5 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs text-muted-foreground font-medium">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">{MOCK_USER.fullName}</p>
                    {MOCK_USER.membershipTier === 'premium' && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase mt-1.5 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                        <Award className="w-2.5 h-2.5" /> Premium Member
                      </span>
                    )}
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/profile#settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 rounded-xl transition-all"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Account Settings</span>
                  </Link>

                  <div className="border-t border-white/10 my-1" />

                  <Link
                    href="/"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
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
