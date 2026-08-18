'use client'
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, Award, Star, Calendar, 
  Clock, X, Check, ArrowRight, ShieldCheck, 
  MessageSquare, Video 
} from 'lucide-react'
import { MOCK_MENTORS, SKILLS } from '@/lib/constants'
import toast from 'react-hot-toast'
import { useAuth } from '@/modules/module3/components/AuthContext'
import { useEffect } from 'react'
import { mentorsApi } from '@/lib/api'

export default function MentorsPage() {
  const { user, profile } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('all')
  const [activeBookingMentor, setActiveBookingMentor] = useState<any | null>(null)
  const [mentors, setMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [bookingDetails, setBookingDetails] = useState({
    date: '',
    time: '10:00 AM',
    reason: '',
  })

  // Fetch mentors list
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const res = await mentorsApi.list()
        if (res.data) {
          setMentors(res.data)
        } else {
          setMentors(MOCK_MENTORS)
        }
      } catch (err) {
        console.error("Failed to fetch mentors", err)
        setMentors(MOCK_MENTORS)
      } finally {
        setLoading(false)
      }
    }
    fetchMentors()
  }, [])

  // Filtered mentors list
  const filteredMentors = useMemo(() => {
    return (mentors.length > 0 ? mentors : MOCK_MENTORS).filter((men: any) => {
      const matchesSearch = (men.name || '').toLowerCase().includes(search.toLowerCase()) ||
                            (men.company || '').toLowerCase().includes(search.toLowerCase()) ||
                            (men.role || '').toLowerCase().includes(search.toLowerCase())
      
      const matchesSkill = selectedSkill === 'all' || (men.skills || []).includes(selectedSkill)

      return matchesSearch && matchesSkill
    })
  }, [mentors, search, selectedSkill])

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingDetails.date) {
      toast.error('Please select a booking date')
      return
    }
    if (!user) {
      toast.error('Please sign in to book a session')
      return
    }
    
    try {
      await mentorsApi.book(activeBookingMentor.id, {
        memberId: user.uid,
        memberName: profile?.fullName || "Anonymous Member",
        dateTime: `${bookingDetails.date} ${bookingDetails.time}`,
        status: "Pending",
        reason: bookingDetails.reason,
      })

      toast.success(`Session booked with ${activeBookingMentor.name} for ${bookingDetails.date} @ ${bookingDetails.time}! Meet link: https://meet.google.com/abc-defg-hij 📅`)
      setActiveBookingMentor(null)
      setBookingDetails({ date: '', time: '10:00 AM', reason: '' })
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to submit booking request.")
    }
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header section */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Ecosystem Expert Mentorship</h1>
        <p className="text-xs text-muted-foreground mt-1">Book 1-on-1 video mentorship sessions with tech leaders at Google, Vercel, and Stripe.</p>
      </div>

      {/* Filter Utilities */}
      <section className="glass rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search mentors by name, role, or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-white"
            />
          </div>

          {/* Skill Filter Selector */}
          <div className="w-full md:w-auto shrink-0">
            <select
              value={selectedSkill}
              onChange={e => setSelectedSkill(e.target.value)}
              className="w-full md:w-48 px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Filter by Skill Tag</option>
              {SKILLS.slice(0, 8).map((sk: string) => <option key={sk} value={sk}>{sk}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Grid listing */}
      <AnimatePresence mode="wait">
        {filteredMentors.length > 0 ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {filteredMentors.map((men: any) => (
              <div
                key={men.id}
                className="glass rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-5 justify-between hover:border-primary/30 transition-all hover:shadow-[0_0_20px_rgba(217,70,239,0.15)] group relative overflow-hidden"
              >
                {men.isPremiumOnly && (
                  <div className="absolute top-0 right-0 p-0 hover:scale-105 pointer-events-none">
                    <span className="inline-flex items-center gap-0.5 px-3 py-1 bg-amber-500 text-white text-[9px] font-bold uppercase rounded-bl-2xl shadow">
                      <Star className="w-2.5 h-2.5 fill-current" /> Premium
                    </span>
                  </div>
                )}

                {/* Profile Avatar Block */}
                <div className="flex gap-4 items-start flex-1 min-w-0">
                  <img
                    src={men.avatar}
                    alt={men.name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-muted"
                  />
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-display font-bold text-sm md:text-base text-foreground truncate group-hover:text-primary transition-colors">
                      {men.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate font-medium">
                      {men.role} @ <strong className="font-bold text-foreground">{men.company}</strong>
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" /> {men.rating}
                      </span>
                      <span>•</span>
                      <span>{men.sessions} sessions completed</span>
                    </div>
                  </div>
                </div>

                {/* Content & Action summary */}
                <div className="md:w-56 space-y-4 flex flex-col justify-between shrink-0 border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-5">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Skills & Specialty</span>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(men.skills) ? men.skills : (men.skills ? men.skills.split(', ') : [])).slice(0, 3).map((sk: string) => (
                        <span key={sk} className="text-[9px] font-semibold px-2 py-0.5 rounded bg-white/10 text-white">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (men.isPremiumOnly && profile?.role !== 'Premium Member' && profile?.role !== 'Admin') {
                        toast.error('This mentor is available for Premium members only.')
                        window.location.href = '/membership'
                        return
                      }
                      setActiveBookingMentor(men)
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 text-white text-xs font-semibold shadow transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(217,70,239,0.4)] border-none"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Book 1-on-1 Session
                  </button>
                </div>
              </div>
            ))}
          </motion.section>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-12 text-center shadow-sm space-y-3 max-w-sm mx-auto"
          >
            <Users className="w-10 h-10 text-muted-foreground/80 mx-auto" />
            <h3 className="font-display text-sm font-bold text-foreground">No mentors found</h3>
            <p className="text-xs text-muted-foreground">Adjust your keyword search or skills tags and check again.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Drawer Modal dialog */}
      <AnimatePresence>
        {activeBookingMentor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveBookingMentor(null)}
              className="fixed inset-0 bg-black"
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden z-10"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                <span className="text-xs font-bold uppercase tracking-wider text-white">Schedule Mentoring Slot</span>
                <button onClick={() => setActiveBookingMentor(null)} className="p-1 rounded-lg hover:bg-white/10 text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="p-6 space-y-5">
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-2xl p-4">
                  <img
                    src={activeBookingMentor.avatar}
                    alt={activeBookingMentor.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground leading-snug">{activeBookingMentor.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{activeBookingMentor.role} @ {activeBookingMentor.company}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Select Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Available Date</label>
                    <input 
                      type="date" 
                      required 
                      value={bookingDetails.date}
                      onChange={e => setBookingDetails(p => ({ ...p, date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40" 
                    />
                    <p className="text-[9px] text-muted-foreground">Availability notes: <strong className="font-bold text-white">{activeBookingMentor.availability}</strong></p>
                  </div>

                  {/* Select Time */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Session Interval Hour
                    </label>
                    <select
                      value={bookingDetails.time}
                      onChange={e => setBookingDetails(p => ({ ...p, time: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="10:00 AM">10:00 AM - 11:00 AM IST</option>
                      <option value="02:00 PM">02:00 PM - 03:00 PM IST</option>
                      <option value="05:00 PM">05:00 PM - 06:00 PM IST</option>
                      <option value="08:00 PM">08:00 PM - 09:00 PM IST</option>
                    </select>
                  </div>

                  {/* Booking Reason */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" /> Core Focus / Topic
                    </label>
                    <textarea 
                      required 
                      rows={3}
                      placeholder="What would you like to focus on? (e.g. React 19 architecture review, resume audit, system designs...)"
                      value={bookingDetails.reason}
                      onChange={e => setBookingDetails(p => ({ ...p, reason: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 leading-relaxed" 
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex gap-2.5 text-[10px] text-muted-foreground leading-normal">
                  <Video className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Your session will be scheduled and a direct Google Meet link will be provided upon confirmation.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 text-white font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)] flex items-center justify-center gap-1.5 border-none"
                >
                  <Check className="w-4 h-4" /> Finalize Mentoring Session
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
