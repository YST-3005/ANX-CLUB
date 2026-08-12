'use client'
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  LineChart, TrendingUp, Download, IndianRupee, 
  Users, Calendar, Clock, BarChart3, PieChart 
} from 'lucide-react'
import { MOCK_EVENTS } from '@/frontend/lib/constants'
import { formatCurrency } from '@/frontend/lib/utils'
import toast from 'react-hot-toast'

export default function AnalyticsDashboard() {
  const [loadingExport, setLoadingExport] = useState(false)

  const handleExportData = async () => {
    setLoadingExport(true)
    await new Promise(r => setTimeout(r, 1400))
    setLoadingExport(false)
    toast.success('System report compiled! Ecosystem_Analytics_May2026.csv downloaded. 📊')
  }

  return (
    <div className="space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">System Analytics Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">Audit detailed cohort growth rates, course conversions, and financial statements.</p>
        </div>
        
        <button
          onClick={handleExportData}
          disabled={loadingExport}
          className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0"
        >
          {loadingExport ? (
            <div className="w-4 h-4 border-2 border-zinc-100/30 border-t-zinc-100 rounded-full animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" /> Export Spreadsheet CSV
            </>
          )}
        </button>
      </div>

      {/* KPI Stats Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Average Conversion</span>
          <h3 className="font-display text-2xl font-bold text-foreground">72.4%</h3>
          <span className="text-[9px] text-emerald-500 font-semibold">+4.2% from last quarter</span>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Customer Lifetime Value</span>
          <h3 className="font-display text-2xl font-bold text-foreground">₹2,840</h3>
          <span className="text-[9px] text-emerald-500 font-semibold">Premium Annual renewal at 89%</span>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Ecosystem Engagement</span>
          <h3 className="font-display text-2xl font-bold text-foreground">84.2h</h3>
          <span className="text-[9px] text-muted-foreground font-medium">Avg monthly mentor session hours</span>
        </div>
      </section>

      {/* Visual Analytics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Metric Card 1: Revenue breakdown (SVG Bar Chart) */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-0.5">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Revenue Stream Channels
            </h3>
            <p className="text-[10px] text-muted-foreground">Monthly cash flow distributions</p>
          </div>

          {/* Custom SVG Bar Chart */}
          <div className="h-56 flex items-end justify-between border-b border-border/40 pb-2 pt-4 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-border/25 w-full" />
              <div className="border-t border-border/25 w-full" />
              <div className="border-t border-border/25 w-full" />
            </div>

            {/* Custom Interactive Bars */}
            <div className="w-full flex justify-around items-end h-full relative z-10">
              <div className="flex flex-col items-center gap-2 group w-12">
                <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">₹42K</span>
                <div className="w-6 bg-amber-500/20 group-hover:bg-amber-500 border border-amber-500/30 rounded-t-lg h-28 transition-all duration-500" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Tiers</span>
              </div>

              <div className="flex flex-col items-center gap-2 group w-12">
                <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">₹55K</span>
                <div className="w-6 bg-amber-500/20 group-hover:bg-amber-500 border border-amber-500/30 rounded-t-lg h-40 transition-all duration-500" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Events</span>
              </div>

              <div className="flex flex-col items-center gap-2 group w-12">
                <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">₹18K</span>
                <div className="w-6 bg-amber-500/20 group-hover:bg-amber-500 border border-amber-500/30 rounded-t-lg h-16 transition-all duration-500" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Mentors</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Card 2: Engagement distribution (SVG Donut Chart) */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-0.5">
            <h3 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-amber-500" /> Segment Engagements
            </h3>
            <p className="text-[10px] text-muted-foreground">Active cohort distribution breakdown</p>
          </div>

          <div className="h-56 flex items-center justify-center gap-8">
            {/* Custom SVG Donut */}
            <div className="relative w-36 h-36 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                {/* Segment 1: Workshops (60%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeDasharray="60 40" strokeDashoffset="0" />
                {/* Segment 2: Mentoring (25%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="2.8" strokeDasharray="25 75" strokeDashoffset="-60" />
                {/* Segment 3: Hackathons (15%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="2.8" strokeDasharray="15 85" strokeDashoffset="-85" />
              </svg>
              {/* Core Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-foreground">1.8K</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Total Actions</span>
              </div>
            </div>

            {/* Legend details */}
            <div className="space-y-3.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>Workshops (60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>Mentoring (25%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Hackathons (15%)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Performing Events Leaderboard */}
      <section className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4.5 border-b border-border/40">
          <h3 className="font-display text-base font-bold text-foreground">Featured Ecosystem Leaderboard</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground tracking-wider font-bold bg-muted/20">
                <th className="py-4.5 px-6">Event Title</th>
                <th className="py-4.5 px-4">Filled Seats</th>
                <th className="py-4.5 px-4">Pricing</th>
                <th className="py-4.5 px-4 text-right">Revenue Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-medium">
              {MOCK_EVENTS.slice(0, 3).map((e) => {
                const yieldAmt = e.registeredCount * e.price
                return (
                  <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-4 px-6 font-bold text-foreground">{e.title}</td>
                    <td className="py-4 px-4 font-semibold text-muted-foreground">{e.registeredCount} attendees ({Math.round((e.registeredCount / e.capacity) * 100)}%)</td>
                    <td className="py-4 px-4 font-semibold text-muted-foreground">{e.price === 0 ? 'Free' : formatCurrency(e.price)}</td>
                    <td className="py-4 px-4 text-right font-bold text-foreground">{yieldAmt === 0 ? '₹0 (Free)' : formatCurrency(yieldAmt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
