'use client'
import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Search, Award, Plus, Trash2, 
  ExternalLink, Clock, Play, MapPin, Eye 
} from 'lucide-react'
import { MOCK_EVENTS } from '@/lib/constants'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ManageEventsPage() {
  const [events, setEvents] = useState(MOCK_EVENTS)
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      return e.title.toLowerCase().includes(search.toLowerCase()) || 
             e.category.toLowerCase().includes(search.toLowerCase()) ||
             (e.speaker && e.speaker.toLowerCase().includes(search.toLowerCase()))
    })
  }, [search, events])

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete this event: "${title}"? This cannot be undone.`)) {
      setEvents(prev => prev.filter(e => e.id !== id))
      toast.success('Event deleted successfully!')
    }
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Manage Platform Events</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure registrations, review session agenda slots, and schedule new workshops.</p>
        </div>
        <Link
          href="/admin/events/create"
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow shadow-amber-500/10 shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Event
        </Link>
      </div>

      {/* Filters */}
      <section className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <div className="relative max-w-md w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by title, speaker, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl text-xs placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-card transition-all"
          />
        </div>
      </section>

      {/* Listing Grid/Table */}
      <section className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground tracking-wider font-bold bg-muted/20">
                <th className="py-4.5 px-6">Event details</th>
                <th className="py-4.5 px-4">Led by Speaker</th>
                <th className="py-4.5 px-4">Date & Time</th>
                <th className="py-4.5 px-4">Registrations</th>
                <th className="py-4.5 px-4">Pricing</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium">
              <AnimatePresence>
                {filteredEvents.map((evt) => (
                  <motion.tr 
                    key={evt.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                    className="hover:bg-muted/10 transition-colors"
                  >
                    {/* Title & category */}
                    <td className="py-4 px-6 max-w-[200px]">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{evt.category}</span>
                        <h4 className="font-bold text-foreground line-clamp-1 leading-snug">{evt.title}</h4>
                      </div>
                    </td>

                    {/* Speaker */}
                    <td className="py-4 px-4 text-foreground truncate max-w-[150px]">
                      {evt.speaker ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={evt.speakerImage}
                            alt={evt.speaker}
                            className="w-6.5 h-6.5 rounded-full object-cover"
                          />
                          <span className="truncate">{evt.speaker}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">No speaker</span>
                      )}
                    </td>

                    {/* Date / Time */}
                    <td className="py-4 px-4 text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary shrink-0" /> {formatDate(evt.date)} • {evt.time}
                      </span>
                    </td>

                    {/* Registrations */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{evt.registeredCount} / {evt.capacity} filled</span>
                        </div>
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${Math.round((evt.registeredCount / evt.capacity) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="py-4 px-4 text-foreground font-bold">
                      {evt.price === 0 ? (
                        <span className="text-emerald-500 font-extrabold text-[10px]">FREE</span>
                      ) : (
                        formatCurrency(evt.price)
                      )}
                      {evt.premiumOnly && (
                        <span className="block text-[8px] bg-amber-500/10 text-amber-500 font-bold px-1 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest mt-1 w-max">
                          Premium Only
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/events/${evt.id}`}
                          className="p-2 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                          title="View Event Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(evt.id, evt.title)}
                          className="p-2 rounded-lg border border-border/40 hover:bg-rose-500/5 text-rose-500 hover:text-rose-600 transition-all shrink-0"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
