'use client'
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, SlidersHorizontal, Calendar, Clock, 
  MapPin, Users, Award, ExternalLink, CheckCircle2, 
  Tag, RefreshCw 
} from 'lucide-react'
import { MOCK_EVENTS, MOCK_USER } from '@/frontend/lib/constants'
import { formatDate, formatCurrency } from '@/frontend/lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '@/modules/module3/components/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'webinar', label: 'Webinars' },
  { id: 'hackathon', label: 'Hackathons' },
  { id: 'networking', label: 'Networking' },
]

const EventCardMemo = React.memo(function EventCardMemoItem({
  evt,
  isUserRegistered,
  onRegisterToggle,
}: {
  evt: any;
  isUserRegistered: boolean;
  onRegisterToggle: (id: string, title: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all hover:shadow-md group"
    >
      {/* Poster Image */}
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        <img
          src={evt.posterUrl}
          alt={evt.title}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Floating indicators */}
        <div className="absolute top-3.5 left-3.5 flex gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[9px] text-white font-bold uppercase tracking-wider">
            {evt.category}
          </span>
        </div>

        <div className="absolute top-3.5 right-3.5">
          {evt.premiumOnly ? (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider shadow">
              <Award className="w-2.5 h-2.5" /> Premium
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider shadow">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h3 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {evt.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {evt.description}
          </p>
        </div>

        {/* Metadata details */}
        <div className="space-y-2.5 border-t border-border/40 pt-4 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span>{formatDate(evt.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>{evt.time} ({evt.duration} mins)</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{evt.venue}</span>
          </div>
        </div>

        {/* Speaker Info Card */}
        {evt.speaker && (
          <div className="flex items-center gap-2.5 bg-muted/30 p-2.5 rounded-xl border border-border/20">
            <img
              src={evt.speakerImage}
              alt={evt.speaker}
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground leading-none">Led by</p>
              <p className="text-xs font-bold text-foreground truncate mt-0.5 leading-none">{evt.speaker}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Link
            href={`/events/${evt.id}`}
            className="px-4 py-2.5 rounded-xl border border-border/80 hover:bg-muted text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-1 hover:border-foreground/30 shrink-0"
          >
            Details <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => onRegisterToggle(evt.id, evt.title)}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
              isUserRegistered
                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                : 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10'
            }`}
          >
            {isUserRegistered ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Registered
              </>
            ) : (
              'Register Event'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
});

export default function EventsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all') // 'all' | 'free' | 'premium'
  const [registeredList, setRegisteredList] = useState<string[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/events")
      const data = await res.json()
      if (data.success) {
        setEvents(data.data)
      } else if (Array.isArray(data)) {
        setEvents(data)
      } else {
        setEvents(MOCK_EVENTS)
      }
    } catch (err) {
      console.error(err)
      setEvents(MOCK_EVENTS)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserRegistrations = useCallback(async () => {
    if (!user) return
    try {
      const snap = await getDocs(
        query(collection(db, "eventRegistrations"), where("userId", "==", user.uid))
      )
      const ids = snap.docs.map((d) => d.data().eventId as string)
      setRegisteredList(ids)
    } catch (err) {
      console.error(err)
    }
  }, [user])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (user) {
      fetchUserRegistrations()
    }
  }, [user, fetchUserRegistrations])

  const handleRegisterToggle = async (eventId: string, title: string) => {
    if (!user) {
      toast.error("Please sign in to register for events!")
      return
    }
    
    const isRegistered = registeredList.includes(eventId)
    try {
      if (isRegistered) {
        // Cancel registration
        const snap = await getDocs(
          query(
            collection(db, "eventRegistrations"), 
            where("userId", "==", user.uid),
            where("eventId", "==", eventId)
          )
        )
        // Delete registration docs or hit route API
        // For simplicity, we hit the register API route if available, or do it on DB
        // Let's do it on Firestore:
        const deletePromises = snap.docs.map(async (docRef) => {
          const { doc, deleteDoc } = await import('firebase/firestore')
          await deleteDoc(doc(db, "eventRegistrations", docRef.id))
        })
        await Promise.all(deletePromises)
        
        setRegisteredList(p => p.filter(id => id !== eventId))
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, seatsAvailable: (e.seatsAvailable || 0) + 1 } : e))
        toast.success(`Cancelled registration for: ${title}`)
      } else {
        // Register
        const { addDoc } = await import('firebase/firestore')
        await addDoc(collection(db, "eventRegistrations"), {
          eventId,
          userId: user.uid,
          registeredAt: new Date().toISOString()
        })
        
        setRegisteredList(p => [...p, eventId])
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, seatsAvailable: Math.max(0, (e.seatsAvailable || 0) - 1) } : e))
        toast.success(`Successfully registered for: ${title}! 🎉`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to update registration status.")
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    return (events.length > 0 ? events : MOCK_EVENTS).filter(evt => {
      const matchesSearch = evt.title.toLowerCase().includes(search.toLowerCase()) || 
                            evt.description.toLowerCase().includes(search.toLowerCase()) ||
                            (evt.speaker && evt.speaker.toLowerCase().includes(search.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || evt.category === selectedCategory
      
      let matchesPrice = true
      if (priceFilter === 'free') {
        matchesPrice = evt.price === 0
      } else if (priceFilter === 'premium') {
        matchesPrice = evt.premiumOnly === true
      }

      return matchesSearch && matchesCategory && matchesPrice
    })
  }, [events, search, selectedCategory, priceFilter])

  return (
    <div className="space-y-8 select-none">
      {/* Header section */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Club & Ecosystem Events</h1>
        <p className="text-xs text-muted-foreground mt-1">Discover, learn, and expand your professional circle with highly-curated workshops.</p>
      </div>

      {/* Filter Utilities */}
      <section className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by title, speaker, or keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl text-xs placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card transition-all"
            />
          </div>

          {/* Pricing filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter Price:
            </span>
            {['all', 'free', 'premium'].map((f) => (
              <button
                key={f}
                onClick={() => setPriceFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shrink-0 ${
                  priceFilter === f
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/10'
                    : 'bg-muted/50 border border-border/40 hover:bg-muted text-muted-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-t border-border/40 pt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-all shrink-0 ${
                  isSelected ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeCategoryIndicator"
                    className="absolute inset-0 bg-primary/10 border border-primary/25 rounded-xl"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">{cat.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Events Grid */}
      <AnimatePresence mode="wait">
        {filteredEvents.length > 0 ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 [content-visibility:auto]"
          >
            {filteredEvents.map((evt) => {
              const isUserRegistered = registeredList.includes(evt.id)
              
              return (
                <EventCardMemo
                  key={evt.id}
                  evt={evt}
                  isUserRegistered={isUserRegistered}
                  onRegisterToggle={handleRegisterToggle}
                />
              )
            })}
          </motion.section>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-12 text-center shadow-sm space-y-4 max-w-md mx-auto"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground">No events match your criteria</h3>
              <p className="text-xs text-muted-foreground">Try modifying your search or changing the pricing filter tags.</p>
            </div>
            <button
              onClick={() => {
                setSearch('')
                setSelectedCategory('all')
                setPriceFilter('all')
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-xl transition-colors shadow"
            >
              Reset Filters
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
