'use client'
import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, Search, ShieldCheck, Mail, GraduationCap, 
  Trash2, UserCheck, ToggleLeft, ToggleRight, Plus 
} from 'lucide-react'
import toast from 'react-hot-toast'

const mockMembers = [
  { id: 'mem-1', fullName: 'Arjun Sharma', email: 'arjun.sharma@iitm.ac.in', college: 'IIT Madras', year: '3rd Year', tier: 'premium', status: 'active' },
  { id: 'mem-2', fullName: 'Priya Nambiar', email: 'priya.n@nitt.edu', college: 'NIT Trichy', year: '4th Year', tier: 'premium', status: 'active' },
  { id: 'mem-3', fullName: 'Rahul Dev', email: 'rahul.dev@bits.ac.in', college: 'BITS Pilani', year: '2nd Year', tier: 'free', status: 'active' },
  { id: 'mem-4', fullName: 'Sneha Sen', email: 'snehasen@iitb.ac.in', college: 'IIT Bombay', year: '1st Year', tier: 'free', status: 'suspended' },
  { id: 'mem-5', fullName: 'Amit Roy', email: 'amit.roy@iitd.ac.in', college: 'IIT Delhi', year: '3rd Year', tier: 'premium', status: 'active' },
]

export default function ManageMembersPage() {
  const [members, setMembers] = useState(mockMembers)
  const [search, setSearch] = useState('')

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      return m.fullName.toLowerCase().includes(search.toLowerCase()) ||
             m.college.toLowerCase().includes(search.toLowerCase()) ||
             m.email.toLowerCase().includes(search.toLowerCase())
    })
  }, [search, members])

  const handleToggleStatus = (id: string, current: string) => {
    const next = current === 'active' ? 'suspended' : 'active'
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: next } : m))
    toast.success(`Account status updated to ${next}!`)
  }

  const handleToggleTier = (id: string, current: string) => {
    const next = current === 'premium' ? 'free' : 'premium'
    setMembers(prev => prev.map(m => m.id === id ? { ...m, tier: next } : m))
    toast.success(`Membership tier updated to ${next}!`)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove member: ${name}?`)) {
      setMembers(prev => prev.filter(m => m.id !== id))
      toast.success(`${name} has been removed from database.`)
    }
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Manage Platform Members</h1>
        <p className="text-xs text-muted-foreground mt-1">Review active student cohorts, configure account statuses, and audit billing permissions.</p>
      </div>

      {/* Directory Search controls */}
      <section className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
        <div className="relative max-w-md w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by student name, college, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl text-xs placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-card transition-all"
          />
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground tracking-wider font-bold bg-muted/20">
                <th className="py-4.5 px-6">Member details</th>
                <th className="py-4.5 px-4">College</th>
                <th className="py-4.5 px-4">Graduation</th>
                <th className="py-4.5 px-4">Tier Level</th>
                <th className="py-4.5 px-4">Operator status</th>
                <th className="py-4.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium">
              <AnimatePresence>
                {filteredMembers.map((m) => {
                  const isActive = m.status === 'active'
                  const isPremium = m.tier === 'premium'

                  return (
                    <motion.tr 
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="hover:bg-muted/10 transition-colors"
                    >
                      {/* Name Details */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white font-bold flex items-center justify-center shrink-0">
                          {m.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground truncate">{m.fullName}</h4>
                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3.5 h-3.5" /> {m.email}
                          </p>
                        </div>
                      </td>

                      {/* College */}
                      <td className="py-4 px-4 text-foreground truncate max-w-[150px]">
                        {m.college}
                      </td>

                      {/* Graduation */}
                      <td className="py-4 px-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-primary shrink-0" /> {m.year}
                        </span>
                      </td>

                      {/* Tier level */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleTier(m.id, m.tier)}
                          className={`px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide transition-all ${
                            isPremium 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                              : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                          }`}
                        >
                          {m.tier}
                        </button>
                      </td>

                      {/* Operator status */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          {m.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(m.id, m.status)}
                            className="p-2 rounded-lg border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                            title="Toggle Status"
                          >
                            {isActive ? (
                              <ToggleRight className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-rose-500" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, m.fullName)}
                            className="p-2 rounded-lg border border-border/40 hover:bg-rose-500/5 text-rose-500 hover:text-rose-600 transition-all shrink-0"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
