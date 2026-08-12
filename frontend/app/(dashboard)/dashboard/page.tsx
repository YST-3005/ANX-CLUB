'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Sparkles, Award, Calendar, Users, BookOpen, 
  ArrowRight, ShieldCheck, Clock, Bell, ExternalLink, 
  CheckCircle2, Compass, Bookmark, TrendingUp, Settings 
} from 'lucide-react'
import { MOCK_USER, MOCK_EVENTS, MOCK_ANNOUNCEMENTS, MOCK_RESOURCES, MOCK_MENTORS } from '@/frontend/lib/constants'
import { formatDate, formatCurrency } from '@/frontend/lib/utils'
import toast from 'react-hot-toast'

import { useAuth } from '@/modules/module3/components/AuthContext'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [registeredList, setRegisteredList] = useState<string[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    const fetchBff = async () => {
      if (!user) return
      try {
        const token = await user.getIdToken()
        const res = await fetch("/api/v1/module2/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDashboardData(data)
          if (data.registeredEvents) {
            setRegisteredList(data.registeredEvents.map((e: any) => e.id))
          }
          if (data.upcomingEvents) {
            setEvents(data.upcomingEvents)
          }
        }
      } catch (err) {
        console.error("BFF load error", err)
      } finally {
        setLoading(false)
      }
    }
    if (user && !authLoading) {
      fetchBff()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  const handleRegisterToggle = (eventId: string, title: string) => {
    if (registeredList.includes(eventId)) {
      setRegisteredList(p => p.filter(id => id !== eventId))
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, seatsAvailable: (e.seatsAvailable || 0) + 1 } : e))
      toast.success(`Cancelled registration for: ${title}`)
    } else {
      setRegisteredList(p => [...p, eventId])
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, seatsAvailable: Math.max(0, (e.seatsAvailable || 0) - 1) } : e))
      toast.success(`Successfully registered for: ${title}! 🎉`)
    }
  }

  return (
    <div className="space-y-8 select-none">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-blue-600/90 via-cyan-600/80 to-purple-600/80 p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute inset-0 bg-grid-white/[0.07] bg-[size:30px_30px]" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin-slow" />
            ANX Platform Active
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
            Welcome back, {profile?.fullName || MOCK_USER.fullName}!
          </h1>
          <p className="text-blue-50/90 max-w-xl text-sm md:text-base leading-relaxed font-medium">
            You have <span className="underline decoration-yellow-300 decoration-2 font-bold">{registeredList.length} registered events</span> coming up this month. Level up your skills with our top mentors today!
          </p>
        </div>
      </section>

      {/* Grid: Membership + Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membership Status Card */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl transition-all group-hover:bg-amber-500/10" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Subscription status</span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
                (profile?.membershipType === "Premium" || profile?.role === "Admin")
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  : "bg-muted text-muted-foreground border border-border"
              }`}>
                <Award className="w-3.5 h-3.5" /> {profile?.membershipType || "Free"} Member
              </span>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-display text-2xl font-bold text-foreground">
                {(profile?.membershipType === "Premium" || profile?.role === "Admin") ? "Premium Elite" : "Free Tier"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {profile?.membershipExpiry ? `Expires on: ${new Date(profile.membershipExpiry).toLocaleDateString()}` : "Free basic account access"}
              </p>
            </div>

            <div className="space-y-2 border-t border-border/40 pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Unlimited premium event registrations</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>1-on-1 mentor booking slots (5h/mo)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Priority career assistance & opportunities</span>
              </div>
            </div>
          </div>

          <Link href="/membership" className="mt-6 flex items-center justify-center gap-1.5 w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs transition-colors border border-border/40">
            Manage Subscription <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link href="/events" className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-center transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Join Events</span>
              <span className="text-[10px] text-muted-foreground mt-1">Browse listing</span>
            </Link>

            <Link href="/mentors" className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-purple-50/10 hover:border-purple-500/40 text-center transition-all group">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Book Mentor</span>
              <span className="text-[10px] text-muted-foreground mt-1">1-on-1 advice</span>
            </Link>

            <Link href="/resources" className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-emerald-50/10 hover:border-emerald-500/40 text-center transition-all group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Library</span>
              <span className="text-[10px] text-muted-foreground mt-1">Read templates</span>
            </Link>

            <Link href="/profile" className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-amber-50/10 hover:border-amber-500/40 text-center transition-all group">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Settings</span>
              <span className="text-[10px] text-muted-foreground mt-1">Update profile</span>
            </Link>
          </div>

          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between text-xs text-primary font-medium">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span>Special Offer: Complete 3 mentoring sessions to earn a Verified Certificate!</span>
            </div>
            <Link href="/mentors" className="hover:underline flex items-center gap-0.5 shrink-0">
              Start booking <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Upcoming Events */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-foreground">Featured Ecosystem Events</h2>
              <p className="text-xs text-muted-foreground">High-impact interactive sessions you don't want to miss</p>
            </div>
            <Link href="/events" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              All Events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.slice(0, 4).map((evt) => {
              const isUserRegistered = registeredList.includes(evt.id)
              
              return (
                <div key={evt.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/30 transition-all hover:shadow-md group">
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img
                      src={evt.posterUrl}
                      alt={evt.title}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[10px] text-white font-semibold uppercase tracking-wider">
                        {evt.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-display font-bold text-sm text-foreground line-clamp-1 leading-snug">{evt.title}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{evt.description}</p>
                    </div>

                    <div className="space-y-2 border-t border-border/40 pt-3 text-[11px] text-muted-foreground font-medium">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary" /> {formatDate(evt.date)} @ {evt.time}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted font-bold text-foreground">
                          {evt.seatsAvailable} seats left
                        </span>
                      </div>
                      
                      {evt.speaker && (
                        <div className="flex items-center gap-2 mt-2 bg-muted/30 p-2 rounded-lg">
                          <img
                            src={evt.speakerImage}
                            alt={evt.speaker}
                            className="w-5.5 h-5.5 rounded-full object-cover shrink-0"
                          />
                          <span className="truncate text-foreground text-[10px]">Led by <strong className="font-semibold">{evt.speaker}</strong></span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRegisterToggle(evt.id, evt.title)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        isUserRegistered
                          ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10'
                      }`}
                    >
                      {isUserRegistered ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Registered
                        </>
                      ) : (
                        'Register Now'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right 1 Column: Announcements + Mentors */}
        <section className="space-y-6">
          {/* Announcements Feed */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">Announcements</h3>
              </div>
              <Link href="/announcements" className="text-[11px] text-primary font-bold hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {(dashboardData?.announcements || MOCK_ANNOUNCEMENTS).slice(0, 3).map((ann: any) => {
                const priorityColors = {
                  high: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                  low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                }

                return (
                  <div key={ann.id} className="space-y-1.5 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">{ann.author || 'Admin'}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${priorityColors[ann.priority as keyof typeof priorityColors] || priorityColors.low}`}>
                        {ann.priority || 'low'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-1">{ann.title}</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{ann.content}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Featured Mentors */}
          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">Ecosystem Mentors</h3>
              </div>
              <Link href="/mentors" className="text-[11px] text-primary font-bold hover:underline">
                Meet More
              </Link>
            </div>

            <div className="space-y-3.5">
              {(dashboardData?.mentorBookings || MOCK_MENTORS).slice(0, 3).map((men: any) => (
                <div key={men.id} className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={men.avatar || men.mentorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"}
                      alt={men.name || men.mentorName}
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{men.name || men.mentorName}</h4>
                      <p className="text-[10px] text-muted-foreground truncate">{men.role || 'Advisor'} @ <strong className="font-semibold">{men.company || 'ANX'}</strong></p>
                    </div>
                  </div>

                  <Link href="/mentors" className="p-1.5 rounded-lg border border-border/40 hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Library Spotlight Section */}
      <section className="bg-muted/30 border border-border/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">Recommended Resources Library</h3>
          </div>
          <Link href="/resources" className="text-xs font-bold text-primary hover:underline">
            Go to Library
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(dashboardData?.recommendations || MOCK_RESOURCES).slice(0, 3).map((res: any) => (
            <div key={res.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span className="uppercase">{res.category}</span>
                  <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">{res.level}</span>
                </div>
                <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-1">{res.title}</h4>
              </div>

              <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-4">
                <span className="text-[10px] text-muted-foreground">{res.duration || 'Flexible'}</span>
                {res.isPremium ? (
                  <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded">Premium</span>
                ) : (
                  <span className="text-[9px] bg-blue-500/10 text-blue-500 font-bold px-1.5 py-0.5 rounded">Free</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
